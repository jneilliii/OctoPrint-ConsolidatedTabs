/*
 * View model for OctoPrint-ConsolidatedTabs
 *
 * Author: jneilliii
 * License: AGPLv3
 */
$(function() {
	function ConsolidatedtabsViewModel(parameters) {
        const self = this;

        self.controlViewModel = parameters[0];
		self.temperatureViewModel = parameters[1];
		self.settings = parameters[2];
		self.touchui = parameters[3];
		self.dragonorder = parameters[4];
		self.webcamtab = parameters[5];
		self.terminalViewModel = parameters[6];
		self.prettygcodeViewModel = parameters[7];
        self.classicWebcamViewModel = parameters[8];

		self.availableTabs = ko.observableArray([]);
		self.tabs = ko.observableArray([]);
		self.tab_callbacks = ko.observable({});
		self.resetting_positions = ko.observable(false);
		self.resetting_sizes = ko.observable(false);
		self.settings_ui_changed = ko.observable(false);
		self.editing = ko.observable(false);
		self.saving = ko.observable(false);
		self.widgets_removed = ko.observable(false);
		self.widgets_added = ko.observable(false);
		self.required_callbacks = {onTabChange: {}, onAfterTabChange: {}};
		self.consolidated_tab_active = ko.observable(false);
		self.hide_edit_button = ko.observable(false);
		self.stream = ko.observable();
		self.webcamEnabled = ko.observable();

		self.assignedTabs = ko.pureComputed(function(){
            return ko.utils.arrayMap(self.settings.settings.plugins.consolidatedtabs.gridstack(), function (tab) {
                                    return tab.selector();
                                });
                            });
        self.assignedTabsByID = ko.pureComputed(function(){
            return ko.utils.arrayMap(self.settings.settings.plugins.consolidatedtabs.gridstack(), function (tab) {
                                    return tab.id();
                                });
                            });
        self.unassignedTabs = ko.pureComputed(function() {
            //find out the categories that are missing from uniqueNames
            const differences = ko.utils.compareArrays(self.availableTabs().sort(), self.assignedTabs().sort());
            //return a flat list of differences
            const results = [];
            ko.utils.arrayForEach(differences, function(difference) {
                                    if(difference.status === "deleted") {
                                        results.push(difference.value);
                                    }
                                });
                                return results;
                            });
        self.hasTemp = ko.pureComputed(function(){
            return (self.assignedTabsByID().indexOf('temp_link') > -1);
        });
        self.hasWebcam = ko.pureComputed(function(){
            return ((self.assignedTabsByID().indexOf('control_link') > -1 || self.assignedTabsByID().indexOf('tab_plugin_webcamtab_link') > -1) && (self.settings.webcam_streamUrl().length > 0 && self.settings.webcam_webcamEnabled()));
        });
        self.button_icon = ko.pureComputed(function(){
            if(!self.editing() && !self.saving()) {
                return 'icon icon-pencil';
            } else if(self.editing()) {
                return 'icon icon-save';
            } else if(self.saving()) {
                return 'icon icon-spinner icon-spin disabled';
            } else {
                return 'icon icon-question';
            }
        })
        self.panelPosition = {panel_sizes: {}, panel_positions: {}};
        self.saveNeeded = ko.observable(false);

		self.onStartup = function(){
		    $(window).on('resize', self.resize_container);
        }

        self.resize_container = function(){
		    // bypass if TouchUI is installed and active
            if (self.touchui && self.touchui.isActive()) {
                $('li#tab_plugin_consolidatedtabs_link').remove();
                return
            }
		    // OctoPrint container adjustments
            if(self.settings.settings.plugins.consolidatedtabs.full_width()) {
                $('div.container.octoprint-container').css({'width': '100%'});
                $('#sidebar').css({'margin-left': '40px'});
                $('div.tabbable.span8').css({'width': ($(window).innerWidth() - $('div#sidebar').outerWidth(true) - 40).toString() + 'px'});
            }

			// navbar adjustments
			if(self.settings.settings.plugins.consolidatedtabs.resize_navbar()) {
				$('#navbar > div.navbar-inner > div.container').css({'width':'100%'});
				$('#navbar > div.navbar-inner > div.row-fluid > div.nav-collapse').css({'padding-right':'20px'});
			}
        }

        self.onBeforeBinding = function(){
		    self.hide_edit_button(self.settings.settings.plugins.consolidatedtabs.hide_edit_button());
        }

		self.onAfterBinding = function() {
			self.active_settings = ko.toJSON(self.settings.settings.plugins.consolidatedtabs.gridstack);
			self.remove_title = self.settings.settings.plugins.consolidatedtabs.remove_title();
			self.tab_width = self.settings.settings.plugins.consolidatedtabs.width();
			self.full_width = self.settings.settings.plugins.consolidatedtabs.full_width();
			$('ul#tabs li:not(.dropdown)').each(function(){
				if($(this).attr('id') !== 'tab_plugin_consolidatedtabs_link' && self.assignedTabsByID().indexOf($(this).attr('id')) < 0){
					self.availableTabs.push({id: ko.observable($(this).attr('id')),
								selector: ko.observable($(this).children('a').attr('href')),
								name: $(this).children('a').attr('title') ? ko.observable($(this).children('a').attr('title')) : ko.observable($(this).children('a').text())
								});
				}
			});
			self.resize_container();

			self.grid = GridStack.init({removable: true, removeTimeout: 3000, itemClass: "consolidated", margin: 5, cellHeight: 25, column: 24, float: self.settings.settings.plugins.consolidatedtabs.enable_float(), styleInHead : true});
			self.grid.load(ko.toJS(self.settings.settings.plugins.consolidatedtabs.gridstack()), true);
			// hack to hide file upload overlay
			self.grid.on('dragstart', function(){$('#drop_overlay').hide();});
			self.grid.on('removed', function() {
                self.widgets_removed(true);
			});
		}

		self.toggleEditMode = function(){
		    if(self.saving()){
		        return;
            }
		    if(!self.settings.settings.plugins.consolidatedtabs.hide_instructions() && !self.editing()){
		        $("#consolidatedtabs_edit_overlay").modal("show");
            }
		    self.grid.setStatic(self.editing());
		    self.editing(!self.editing());
		    if(!self.editing()){
		        self.saving(true);
		        var serialized_data = self.grid.save();
		        // hack to remove content before saving
		        for(let item in serialized_data){
		            delete serialized_data[item].content;
                }
		        $('ul#tabs li button.btn-mini').remove();
		        OctoPrint.settings.savePluginSettings('consolidatedtabs', {gridstack: serialized_data})
                    .done(function(data){
                        console.log(data);
                        self.saving(false);
                        if (self.widgets_removed() || self.widgets_added()){
                            self.showReloadDialog();
                        }
                    });
            } else {
		        $('ul#tabs li:not(.dropdown):not(#tab_plugin_consolidatedtabs_link) a').prepend('<button class="btn-mini btn-primary"><i class="icon icon-plus"></i></button> ');
		        $('ul#tabs li button.btn-mini').click(self.addGridstackWidget);
		        self.settings.hide();
            }
        }

        self.addGridstackWidget = function(target){
		    let id = $(target.currentTarget).parent().parent().attr('id');
		    let selector = $(target.currentTarget).parent()[0].hash;
		    let name = $(target.currentTarget).parent().text().trim();
		    self.grid.addWidget({w: 12, h: 25, id: id, selector: selector, name: name});
		    self.availableTabs.remove({'id': ko.observable(id), 'selector': ko.observable(selector), 'name': ko.observable(name)});
		    $(selector).appendTo('div[gs-id='+id+'] div.grid-stack-item-content').removeClass('tab-pane');
		    $('#'+id).remove();
		    self.widgets_removed(true);
        }

		self.showReloadDialog = function(){
			$('#reloadui_overlay_wrapper > div > div > p:nth-child(2)').html('Consolidated Tabs changes detected, you must reload now for these new changes to take effect. This will not interrupt any print jobs you might have ongoing.');
			$('#reloadui_overlay').modal();
        }

        self.reload_needed = function(){
		    if(self.active_settings !== ko.toJSON(self.settings.settings.plugins.consolidatedtabs.gridstack)) {
                return true;
            }
		    if(self.remove_title !== self.settings.settings.plugins.consolidatedtabs.remove_title()){
                return true;
            }
            if(self.full_width !== self.settings.settings.plugins.consolidatedtabs.full_width()){
                return true;
            }
            return false;
        }

		self.onEventSettingsUpdated = function(){
			if (self.reload_needed()){
				self.showReloadDialog();
			}
			self.hide_edit_button(self.settings.settings.plugins.consolidatedtabs.hide_edit_button());
		}

		self.onSettingsHidden = function(){
		    if(self.settings_ui_changed()) {
				self.showReloadDialog();
            }
        }

		self.onAllBound = function(allViewModels) {
		    // bypass if TouchUI is installed and active
            if (self.touchui && self.touchui.isActive()) {
                $('li#tab_plugin_consolidatedtabs_link').remove();
                return
            }
			// get all available tab change callbacks
			ko.utils.arrayForEach(allViewModels,function(item){
				if((item.onTabChange || item.onAfterTabChange) && item !== self){
					ko.utils.arrayForEach(item._bindings,function(binding){
					        if(typeof binding == "object"){
					            self.tab_callbacks()[binding.id] = item;
                            } else {
                                self.tab_callbacks()[binding.replace('#', '')] = item;
                            }
						});
					}
				});
			// don't load when touchui is active and hide tab.
			if(self.touchui && self.touchui.isActive()) {
				$('#tab_plugin_consolidatedtabs_link, #tab_plugin_consolidatedtabs').remove();
				return;
			}
			// move original tab content and remove tab links.
			ko.utils.arrayForEach(self.settings.settings.plugins.consolidatedtabs.gridstack(), function(tab) {
				self.tabs.push(tab);
				if(self.tab_callbacks()[tab.selector().replace('#','')]){
					if(self.tab_callbacks()[tab.selector().replace('#','')].onTabChange){
						self.required_callbacks.onTabChange[tab.selector().replace('#','')] = self.tab_callbacks()[tab.selector().replace('#','')];
					}
					if(self.tab_callbacks()[tab.selector().replace('#','')].onAfterTabChange){
						self.required_callbacks.onAfterTabChange[tab.selector().replace('#','')] = self.tab_callbacks()[tab.selector().replace('#','')];
					}
				}

				$(tab.selector()).appendTo('div[gs-id='+tab.id()+'] div.grid-stack-item-content').removeClass('tab-pane');
				$('#' + tab.id()).remove();
				console.log(self.unassignedTabs());
				if(self.settings.settings.plugins.consolidatedtabs.remove_title() && self.unassignedTabs().length === 0){
				    $('#tab_plugin_consolidatedtabs_link').css({border: '0px', width: '0px', overflow: 'hidden'});
				    $('ul#tabs').css({'border-bottom':'0px'});
				    $('div#tabs_content').css({'padding-top': '0px', 'padding-left': '0px', 'padding-right': '5px', border: '0px', 'margin-top': '-37px'});
				    $('#sidebar').css({'margin-top': '6px'});
                }
			});

			// Pretty GCode Plugin Hacks
            if (self.prettygcodeViewModel) {
                console.log('Applying Pretty GCode Hacks.');
                $('.grid-stack-item.consolidated').not(':has(#tab_plugin_prettygcode)').addClass('pghidden');
                $('#fs_link').attr('href', '/?fullscreen=1#tab_plugin_consolidatedtabs');
            }

			let selected = OctoPrint.coreui.selectedTab;
            if(self.hasWebcam()) {
                if (self.webcamtab) {
                    OctoPrint.coreui.selectedTab = "#tab_plugin_webcamtab";
                } else {
                    OctoPrint.coreui.selectedTab = "#control";
                }
                self.controlViewModel.onAllBound(allViewModels);
            }

			OctoPrint.coreui.selectedTab = selected;
			if(selected === "#tab_plugin_consolidatedtabs" && self.hasTemp()) {
				self.temperatureViewModel._initializePlot();
			}

            if(!self.classicWebcamViewModel){
                self.controlViewModel.onBrowserTabVisibilityChange = function (status) {
                    // bypass if TouchUI is installed and active
                    if ((self.touchui && self.touchui.isActive()) || (!self.controlViewModel._enableWebcam || !self.controlViewModel._disableWebcam)) {
                        $('li#tab_plugin_consolidatedtabs_link').remove();
                        return;
                    }
                    if (status) {
                        let selected = OctoPrint.coreui.selectedTab;
                        if(self.hasWebcam() && selected === "#tab_plugin_consolidatedtabs") {
                            if (self.webcamtab) {
                                OctoPrint.coreui.selectedTab = "#tab_plugin_webcamtab";
                            } else {
                                OctoPrint.coreui.selectedTab = "#control";
                            }
                        }
                        self.controlViewModel._enableWebcam();
                        OctoPrint.coreui.selectedTab = selected;
                        return;
                    } else  {
                        self.controlViewModel._disableWebcam();
                    }
                };
            }
		};

		// fix control tab
		self.onTabChange = function(current, previous) {
			if(current === "#tab_plugin_consolidatedtabs"){
			    if(self.hasWebcam()) {
                    if (self.webcamtab) {
                        OctoPrint.coreui.selectedTab = "#tab_plugin_webcamtab";
                    } else {
                        OctoPrint.coreui.selectedTab = "#control";
                    }
                    if(!self.classicWebcamViewModel && self.controlViewModel._enableWebcam) {
                        self.controlViewModel._enableWebcam();
                    } else if (self.classicWebcamViewModel){
                        self.classicWebcamViewModel._enableWebcam();
                    }
                }
			    self.consolidated_tab_active(true);
				for (let callback in self.required_callbacks.onTabChange){
					self.required_callbacks.onTabChange[callback].isActive = true;
					self.required_callbacks.onTabChange[callback].onTabChange('#'+callback,previous);
				}
			} else {
			    self.consolidated_tab_active(false);
            }
		};

		// fix temperature tab
		self.onAfterTabChange = function(current, previous) {
			if(current === "#tab_plugin_consolidatedtabs"){
				for (let callback in self.required_callbacks.onAfterTabChange){
				    OctoPrint.coreui.selectedTab = '#'+callback;
					self.required_callbacks.onAfterTabChange[callback].isActive = true;
					self.required_callbacks.onAfterTabChange[callback].onAfterTabChange('#'+callback, previous);
				}
			}
			OctoPrint.coreui.selectedTab = current;
		};
	}
	OCTOPRINT_VIEWMODELS.push({
		construct: ConsolidatedtabsViewModel,
		dependencies: ["controlViewModel", "temperatureViewModel", "settingsViewModel", "touchUIViewModel", "dragon_orderViewModel", "webcamTabViewModel", "terminalViewModel", "prettyGCodeViewModel", "classicWebcamViewModel"],
		optional: ["touchUIViewModel", "dragon_orderViewModel", "webcamTabViewModel", "prettyGCodeViewModel", "classicWebcamViewModel"],
		elements: ["#consolidatedtabs_settings_form", "#tab_plugin_consolidatedtabs", "#navbar_plugin_consolidatedtabs", "#consolidatedtabs_edit_overlay"]
	});
});
