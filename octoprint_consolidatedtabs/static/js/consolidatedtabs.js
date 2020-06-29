/*
 * View model for OctoPrint-ConsolidatedTabs
 *
 * Author: jneilliii
 * License: AGPLv3
 */
$(function() {
	function ConsolidatedtabsViewModel(parameters) {
		var self = this;

		self.controlViewModel = parameters[0];
		self.temperatureViewModel = parameters[1];
		self.settings = parameters[2];
		self.touchui = parameters[3];
		self.dragonorder = parameters[4];
		self.webcamtab = parameters[5];

		self.availableTabs = ko.observableArray([]);
		self.tabs = ko.observableArray([]);
		self.tab_callbacks = ko.observable({});
		self.required_callbacks = {onTabChange: {}, onAfterTabChange: {}};
		self.assignedTabs = ko.pureComputed(function(){
								var tabs = ko.utils.arrayMap(self.settings.settings.plugins.consolidatedtabs.tab_order(), function(tab) {
										return tab.selector();
									});
								return tabs;
							});
		self.unassignedTabs = ko.pureComputed(function() {
								//find out the categories that are missing from uniqueNames
								var differences = ko.utils.compareArrays(self.availableTabs().sort(), self.assignedTabs().sort());
								//return a flat list of differences
								var results = [];
								ko.utils.arrayForEach(differences, function(difference) {
									if(difference.status === "deleted") {
										results.push(difference.value);
									}
								});
								return results;
							});
		self.get_position_top = function(panel_id){
			if(self.settings.settings.plugins.consolidatedtabs.positions[panel_id]){
				return self.settings.settings.plugins.consolidatedtabs.positions[panel_id].top();
			}
		}
		self.get_position_left = function(panel_id){
			if(self.settings.settings.plugins.consolidatedtabs.positions[panel_id]){
				return self.settings.settings.plugins.consolidatedtabs.positions[panel_id].left();
			}
		}

		self.onAfterBinding = function(){
			self.active_settings = ko.toJSON(self.settings.settings.plugins.consolidatedtabs);
			$('ul#tabs li:not(.dropdown)').each(function(){
				if($(this).attr('id') !== 'tab_plugin_consolidatedtabs_link'){
					self.availableTabs.push({id: ko.observable($(this).attr('id')),
								selector: ko.observable($(this).children('a').attr('href')),
								name: $(this).children('a').attr('title') ? ko.observable($(this).children('a').attr('title')) : ko.observable($(this).children('a').text()),
								scaffolding: ko.observable('8')
								});
				}
			});
		}

		self.onEventSettingsUpdated = function(){
			if(ko.toJSON(self.settings.settings.plugins.consolidatedtabs) !== self.active_settings) {
				$('#reloadui_overlay_wrapper > div > div > p:nth-child(2)').html('Consolidated Temp Control layout changes detected, you must reload now for these new changes to take effect. This will not interrupt any print jobs you might have ongoing.');
				$('#reloadui_overlay').modal();
			}
		}

		// fix control tab
		self.onTabChange = function(current, previous) {
			if(current === "#tab_plugin_consolidatedtabs"){
				console.log(self.required_callbacks);
				for (callback in self.required_callbacks.onTabChange){
					console.log(callback);
					self.required_callbacks.onTabChange[callback].isActive = true;
					self.required_callbacks.onTabChange[callback].onTabChange('#'+callback,previous);
				}
			}
/* 			if((current === "#tab_plugin_consolidatedtabs") || (current === "#temp") || (current === "#control") || (current === "#tab_plugin_webcamtab")) {
				var selected = OctoPrint.coreui.selectedTab;
				if(self.webcamtab) {
					OctoPrint.coreui.selectedTab = "#tab_plugin_webcamtab";
					self.controlViewModel.onTabChange("#tab_plugin_webcamtab", previous);
				} else {
					OctoPrint.coreui.selectedTab = "#control";
					self.controlViewModel.onTabChange("#control", previous);
				}
				OctoPrint.coreui.selectedTab = selected;
			} else if(previous === "#tab_plugin_consolidatedtabs") {
				self.controlViewModel.onTabChange(current, "#control");
			} */
		};

		self.mouseDownCallback = function(e) {
			if(e.ctrlKey==0) $('div.panel.draggable').removeClass('ui-selected');
			$(this).parent().addClass('ui-selected');
		}

		self.savePosition = function(ui){
			var settings_to_save = {positions: {}};
			settings_to_save.positions[ui.helper.attr('id')] = ui.position;
			OctoPrint.settings.savePluginSettings('consolidatedtabs',settings_to_save).done(function(data){self.onEventSettingsUpdated()});
		}

		self.onAllBound = function(allViewModels) {
			// get all available tab change callbacks
			ko.utils.arrayForEach(allViewModels,function(item){
				if((item.onTabChange || item.onAfterTabChange) && item !== self){
					ko.utils.arrayForEach(item._bindings,function(binding){
							self.tab_callbacks()[binding.replace('#','')] = item;
						});
					}
				});
			// don't load when touchui is active and hide tab.
			if(self.touchui && self.touchui.isActive()) {
				$('#tab_plugin_consolidatedtabs_link, #tab_plugin_consolidatedtabs').remove();
				return;
			}
			// move original tab content and remove tab links.
			ko.utils.arrayForEach(self.settings.settings.plugins.consolidatedtabs.tab_order(), function(tab) {
				self.tabs.push(tab);
				if(self.tab_callbacks()[tab.selector().replace('#','')]){
					if(self.tab_callbacks()[tab.selector().replace('#','')].onTabChange){
						self.required_callbacks.onTabChange[tab.selector().replace('#','')] = self.tab_callbacks()[tab.selector().replace('#','')];
					}
					if(self.tab_callbacks()[tab.selector().replace('#','')].onAfterTabChange){
						self.required_callbacks.onAfterTabChange[tab.selector().replace('#','')] = self.tab_callbacks()[tab.selector().replace('#','')];
					}
				}
				$(tab.selector()).appendTo(tab.selector() + '_panel > div.panel-body').removeClass('tab-pane');
				$('#' + tab.id()).remove();
				$(tab.selector() + '_panel').css({top: self.get_position_top(tab.selector().replace('#','') + '_panel'), left: self.get_position_left(tab.selector().replace('#','') + '_panel')});
			});
			$('div.panel.draggable').draggable({cancel: '.unsortable', handle: '.panel-mover', containment: '#tab_plugin_consolidatedtabs > div.row-fluid', scroll: false, stack: 'div.panel', zIndex: 100, stop: function( event, ui ) {self.savePosition(ui)}});
			$('div.panel.draggable .panel-heading').on('mousedown', self.mouseDownCallback);

			// OctoPrint container adjustments
			if(self.settings.settings.plugins.consolidatedtabs.width().length > 0){
				$('div.octoprint-container').css({'min-width':self.settings.settings.plugins.consolidatedtabs.width() + 'px'});

				// tabs container adjustments
				tabs_width = ($(window).innerWidth() - $('#sidebar').outerWidth() - 40).toString() + 'px';
				$('div.tabbable.span8').css({'width':tabs_width, 'float': 'left'});
			}

			// navbar adjustments
			if(self.settings.settings.plugins.consolidatedtabs.resize_navbar()){
				$('#navbar > div.navbar-inner > div.container').css({'width':'100%'});
				$('#navbar > div.navbar-inner > div.row-fluid > div.nav-collapse').css({'padding-right':'20px'});
			}

			var selected = OctoPrint.coreui.selectedTab;
			if(self.webcamtab) {
				OctoPrint.coreui.selectedTab = "#tab_plugin_webcamtab";
			} else {
				OctoPrint.coreui.selectedTab = "#control";
			}
			self.controlViewModel.onAllBound(allViewModels);
			OctoPrint.coreui.selectedTab = selected;
			if(selected == "#tab_plugin_consolidatedtabs" || selected == "#temp") {
				self.temperatureViewModel._initializePlot();
			}
		};

		self.controlViewModel.onBrowserTabVisibilityChange = function(status) {
			if(status) {
				var selected = OctoPrint.coreui.selectedTab;
				if(self.webcamtab) {
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

		// fix temperature tab
		self.onAfterTabChange = function(current, previous) {
			if(current === "#tab_plugin_consolidatedtabs"){
				for (callback in self.required_callbacks.onAfterTabChange){
					console.log(callback);
					self.required_callbacks.onAfterTabChange[callback].isActive = true;
					self.required_callbacks.onAfterTabChange[callback].onAfterTabChange('#'+callback, previous);
				}
			}
			if((current === "#tab_plugin_consolidatedtabs") || (current === "#temp")) {
				if(!self.temperatureViewModel.plot) {
					self.temperatureViewModel._initializePlot();
				} else {
					self.temperatureViewModel.updatePlot();
				}
				self.temperatureViewModel.onAfterTabChange("#temp", previous);
			} 
		}

		self.addTab = function(data) {
			self.settings.settings.plugins.consolidatedtabs.tab_order.push(data);
			self.availableTabs.remove(data);
		}
		self.removeTab = function(data) {
			console.log(data);
			self.availableTabs.push(data);
			self.settings.settings.plugins.consolidatedtabs.tab_order.remove(data);
		}
	}
	OCTOPRINT_VIEWMODELS.push({
		construct: ConsolidatedtabsViewModel,
		dependencies: ["controlViewModel", "temperatureViewModel", "settingsViewModel", "touchUIViewModel", "dragon_orderViewModel", "WebcamTabViewModel"],
		optional: ["touchUIViewModel", "dragon_orderViewModel", "WebcamTabViewModel"],
		elements: ["#consolidatedtabs_settings_form","#tab_plugin_consolidatedtabs"]
	});
});
