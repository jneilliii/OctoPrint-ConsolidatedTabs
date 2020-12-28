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

		self.availableTabs = ko.observableArray([]);
		self.tabs = ko.observableArray([]);
		self.tab_callbacks = ko.observable({});
		self.resetting_positions = ko.observable(false);
		self.resetting_sizes = ko.observable(false);
		self.settings_ui_changed = ko.observable(false);
		self.editing = ko.observable(false);
		self.saving = ko.observable(false);
		self.widgets_removed = ko.observable(false);
		self.required_callbacks = {onTabChange: {}, onAfterTabChange: {}};

		self.assignedTabs = ko.pureComputed(function(){
            return ko.utils.arrayMap(self.settings.settings.plugins.consolidatedtabs.tab_order(), function (tab) {
                                    return tab.selector();
                                });
                            });
        self.assignedTabsByID = ko.pureComputed(function(){
            return ko.utils.arrayMap(self.settings.settings.plugins.consolidatedtabs.tab_order(), function (tab) {
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
            return (self.assignedTabsByID().indexOf('control_link') > -1 || self.assignedTabsByID().indexOf('tab_plugin_webcamtab_link') > -1);
        });
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

		self.onAfterBinding = function() {
			self.active_settings = ko.toJSON(self.settings.settings.plugins.consolidatedtabs.gridstack);
			// self.remove_title = self.settings.settings.plugins.consolidatedtabs.remove_title();
			self.tab_width = self.settings.settings.plugins.consolidatedtabs.width();
			self.full_width = self.settings.settings.plugins.consolidatedtabs.full_width();
			// self.drag_snap = self.settings.settings.plugins.consolidatedtabs.drag_snap();
			// self.panelPosition.panel_positions = ko.toJS(self.settings.settings.plugins.consolidatedtabs.panel_positions);
			// self.panelPosition.panel_sizes = ko.toJS(self.settings.settings.plugins.consolidatedtabs.panel_sizes);
			// $('ul#tabs li:not(.dropdown)').each(function(){
			// 	if($(this).attr('id') !== 'tab_plugin_consolidatedtabs_link' && self.assignedTabsByID().indexOf($(this).attr('id')) < 0){
			// 		self.availableTabs.push({id: ko.observable($(this).attr('id')),
			// 					selector: ko.observable($(this).children('a').attr('href')),
			// 					name: $(this).children('a').attr('title') ? ko.observable($(this).children('a').attr('title')) : ko.observable($(this).children('a').text())
			// 					});
			// 	}
			// });
			self.resize_container();

			self.grid = GridStack.init({removable: true, removeTimeout: 200, itemClass: "consolidated", margin: 5, cellHeight: 25, column: 24});
			self.grid.load(ko.toJS(self.settings.settings.plugins.consolidatedtabs.gridstack()), true);
			// hack to hide file upload overlay
			self.grid.on('dragstart', function(){$('#drop_overlay').hide();});
			self.grid.on('removed', function() {
                self.widgets_removed(true);
			});
		}

		self.toggleEditMode = function(){
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
                        if (self.widgets_removed()){
                            self.showReloadDialog();
                        }
                    });
            } else {
		        $('ul#tabs li:not(.dropdown):not(#tab_plugin_consolidatedtabs_link) a').prepend('<button class="btn-mini btn-primary"><i class="icon icon-plus"></i></button> ');
		        $('ul#tabs li button.btn-mini').click(self.addGridstackWidget);
            }
        }

        self.addGridstackWidget = function(target){
		    let id = $(target.currentTarget).parent().parent().attr('id');
		    let selector = $(target.currentTarget).parent()[0].hash;
		    let name = $(target.currentTarget).parent().text().trim();
		    self.grid.addWidget({w: 6, h: 25, id: id, selector: selector, name: name});
		    $(selector).appendTo('div[gs-id='+id+'] div.grid-stack-item-content').removeClass('tab-pane');
		    $('#'+id).remove();
		    console.log(id, selector);
        }

		self.showReloadDialog = function(){
			$('#reloadui_overlay_wrapper > div > div > p:nth-child(2)').html('Consolidated Tabs changes detected, you must reload now for these new changes to take effect. This will not interrupt any print jobs you might have ongoing.');
			$('#reloadui_overlay').modal();
        }

        self.reload_needed = function(){
		    if(self.active_settings !== ko.toJSON(self.settings.settings.plugins.consolidatedtabs.gridstack)) {
                return true;
            }
            // if(self.remove_title !== self.settings.settings.plugins.consolidatedtabs.remove_title()){
            //     return true;
            // }
            if(self.full_width !== self.settings.settings.plugins.consolidatedtabs.full_width()){
                return true;
            }
            // if(self.drag_snap !== self.settings.settings.plugins.consolidatedtabs.drag_snap()) {
            //     return true;
            // }
            return false;
        }

		// self.onEventSettingsUpdated = function(){
		// 	if (self.reload_needed()){
		// 		self.showReloadDialog();
		// 	}
		// }

		self.onSettingsHidden = function(){
		    if(self.settings_ui_changed()) {
				self.showReloadDialog();
            }
        }

		// self.mouseDownCallback = function(e) {
		// 	if(e.ctrlKey===0) $('div.panel.draggable').removeClass('ui-selected');
		// 	$(this).parent().addClass('ui-selected');
		// }
        //
		// self.savePosition = function(ui){
        //     self.panelPosition.panel_positions[ui.helper.attr('id')] = ui.position;
        //     self.saveNeeded(true);
		// }
        //
		// self.saveSize = function(ui){
        //     self.panelPosition.panel_sizes[ui.helper.attr('id')] = ui.size;
        //     self.panelPosition.panel_positions[ui.helper.attr('id')] = ui.position;
        //     self.saveNeeded(true);
		// }

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
				// let tab_id = tab.selector().replace('#','') + '_panel';
				// let position_left = (self.settings.settings.plugins.consolidatedtabs.panel_positions[tab_id]) ? (self.settings.settings.plugins.consolidatedtabs.panel_positions[tab_id].left() + 'px') : '0px';
				// let position_top = (self.settings.settings.plugins.consolidatedtabs.panel_positions[tab_id]) ? (self.settings.settings.plugins.consolidatedtabs.panel_positions[tab_id].top() + 'px') : '0px';
				// let size_width = (self.settings.settings.plugins.consolidatedtabs.panel_sizes[tab_id]) ? (self.settings.settings.plugins.consolidatedtabs.panel_sizes[tab_id].width() + 'px') : '590px';
				// let size_height = (self.settings.settings.plugins.consolidatedtabs.panel_sizes[tab_id]) ? (self.settings.settings.plugins.consolidatedtabs.panel_sizes[tab_id].height() + 'px') : 'auto';
				// $('<div class="panel panel-default draggable resizable" id="' + tab.selector().replace('#','') + '_panel" style="width: ' + size_width + '\; height: ' + size_height + '\; left: ' + position_left + '\; top: ' + position_top + '\;"><div class="panel-heading"><span class="panel-mover">'+tab.name()+'</span></div><div class="panel-body"></div></div>').appendTo('#tab_plugin_consolidatedtabs > div.row-fluid');
				$(tab.selector()).appendTo('div[gs-id='+tab.id()+'] div.grid-stack-item-content').removeClass('tab-pane');
				$('#' + tab.id()).remove();
				if(self.settings.settings.plugins.consolidatedtabs.remove_title() && self.unassignedTabs().length === 0){
				    $('#tab_plugin_consolidatedtabs_link').css({border: '0px', width: '0px', overflow: 'hidden'});
				    $('ul#tabs').css({'border-bottom':'0px'});
				    $('div#tabs_content').css({'padding-top': '0px', 'padding-left': '0px', 'padding-right': '5px', border: '0px', 'margin-top': '-37px'});
                }
			});
            // $("#tab_plugin_consolidatedtabs > div").selectable({
            //     filter: '.panel',
            //     cancel: 'a,input,textarea,button,select,option,img,pre',
            //     selected: function( event, ui ) {
            //         if(event.shiftKey) {
            //             $(ui.selected).resizable("option", "disabled", false);
            //             $(ui.selected).draggable("option", "disabled", false);
            //             $(ui.selected).addClass('panel-primary');
            //         }
            //     },
            //     unselected: function( event, ui ) {
            //         $(ui.unselected).resizable( "option", "disabled", true );
            //         $(ui.unselected).draggable( "option", "disabled", true );
            //         $(ui.unselected).removeClass('panel-primary');
            //         if(self.saveNeeded()) {
            //             OctoPrint.settings.savePluginSettings('consolidatedtabs', self.panelPosition).done(function () {
            //                 self.onEventSettingsUpdated();
            //                 self.saveNeeded(false);
            //             });
            //         }
            //     },
            //     unselecting: function(event, ui){
            //         /*if( $(".ui-selected, .ui-unselecting").length > 1 || event.ctrlKey ) {*/
            //         if( $(ui.unselecting).is('.ui-selected') ) {
            //             return false;
            //             $(ui.unselecting).removeClass("ui-unselecting");
            //         }
            //     },
            //     selecting: function(event, ui){
            //         if( $(".ui-selected, .ui-selecting").length > 1) {
            //             $(ui.selecting).removeClass("ui-selecting");
            //         }
            //     }
            // });
            // $("#tab_plugin_consolidatedtabs > div > div.panel").draggable({
            //     handle : '.panel-heading',
            //     containment : '#tab_plugin_consolidatedtabs > div',
            //     snap : self.settings.settings.plugins.consolidatedtabs.drag_snap(),
            //     snapTolerance : 7,
            //     stack: 'div.panel',
            //     snapMode : 'outer',
            //     zIndex: 100,
            //     disabled: true,
            //     start: function (event, ui) {
            //         if (!$(this).is(".ui-selected")) {
            //             $(".ui-selected").removeClass("ui-selected panel-primary");
            //         }
            //     },
            //     stop: function( event, ui ) {self.savePosition(ui)}
            // });
            // $('div.panel.resizable').resizable({handles: 's, w, e, sw, se', disabled: true, stop: function( event, ui ) {self.saveSize(ui)}});

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
		};

        self.controlViewModel.onBrowserTabVisibilityChange = function (status) {
		    // bypass if TouchUI is installed and active
            if (self.touchui && self.touchui.isActive()) {
                $('li#tab_plugin_consolidatedtabs_link').remove();
                return
            }
            if (status && self.hasWebcam()) {
                let selected = OctoPrint.coreui.selectedTab;
                if (self.webcamtab) {
                    OctoPrint.coreui.selectedTab = "#tab_plugin_webcamtab";
                } else {
                    OctoPrint.coreui.selectedTab = "#control";
                }
                self.controlViewModel._enableWebcam();
                OctoPrint.coreui.selectedTab = selected;
            } else {
                self.controlViewModel._disableWebcam();
            }
        };

		// fix control tab
		self.onTabChange = function(current, previous) {
			if(current === "#tab_plugin_consolidatedtabs"){
				for (let callback in self.required_callbacks.onTabChange){
					self.required_callbacks.onTabChange[callback].isActive = true;
					self.required_callbacks.onTabChange[callback].onTabChange('#'+callback,previous);
				}
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
		}

		// self.resetPositions = function() {
		//     self.resetting_positions(true);
		// 	$.ajax({
		// 		url: API_BASEURL + "plugin/consolidatedtabs",
		// 		type: "POST",
		// 		dataType: "json",
        //         data: JSON.stringify({command: 'reset_positions'}),
		// 		contentType: "application/json; charset=UTF-8"
		// 	}).done(function(data){
        //             if(data.positions_reset) {
        //                 self.settings_ui_changed(true);
        //                 self.resetting_positions(false);
        //             }
		// 		});
        // }
        //
        // self.resetSizes = function() {
		//     self.resetting_sizes(true);
		// 	$.ajax({
		// 		url: API_BASEURL + "plugin/consolidatedtabs",
		// 		type: "POST",
		// 		dataType: "json",
        //         data: JSON.stringify({command: 'reset_sizes'}),
		// 		contentType: "application/json; charset=UTF-8"
		// 	}).done(function(data){
        //             if(data.sizes_reset) {
        //                 self.settings_ui_changed(true);
        //                 self.resetting_sizes(false);
        //             }
		// 		});
        // }
        //
		// self.addTab = function(data) {
		// 	self.settings.settings.plugins.consolidatedtabs.tab_order.push(data);
		// 	console.log(data);
		// 	self.grid.addWidget('<div class="grid-stack-item"></div>', {w: 6, h: 25, id: data.id(), selector: data.selector()});
		// 	self.availableTabs.remove(data);
		// }
		// self.removeTab = function(data) {
		// 	self.availableTabs.push(data);
		// 	self.settings.settings.plugins.consolidatedtabs.tab_order.remove(data);
		// }
	}
	OCTOPRINT_VIEWMODELS.push({
		construct: ConsolidatedtabsViewModel,
		dependencies: ["controlViewModel", "temperatureViewModel", "settingsViewModel", "touchUIViewModel", "dragon_orderViewModel", "webcamTabViewModel", "terminalViewModel"],
		optional: ["touchUIViewModel", "dragon_orderViewModel", "webcamTabViewModel"],
		elements: ["#consolidatedtabs_settings_form", "#tab_plugin_consolidatedtabs"]
	});
});
