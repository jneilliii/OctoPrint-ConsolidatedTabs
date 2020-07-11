# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin


class ConsolidatedtabsPlugin(octoprint.plugin.SettingsPlugin,
							 octoprint.plugin.AssetPlugin,
							 octoprint.plugin.TemplatePlugin,
							 octoprint.plugin.SimpleApiPlugin):

	##~~ SettingsPlugin mixin

	def get_settings_defaults(self):
		return dict(
			tab_order=[],
			width="",
			content_width="",
			resize_navbar=True,
			panel_positions={},
			panel_sizes={},
			remove_title=False
		)

	##-- Template mixin
	def get_template_configs(self):
		if self._settings.global_get(["appearance", "name"]) is not None and self._settings.global_get(["appearance", "name"]) != "":
			self._logger.info(self._settings.global_get(["appearance", "name"]))
			tab_name = self._settings.global_get(["appearance", "name"])
		else:
			tab_name = "OctoPrint"

		return [
			dict(type="tab", name=tab_name, custom_bindings=True),
			dict(type="settings", custom_bindings=True)
		]

	##~~ AssetPlugin mixin

	def get_assets(self):
		return dict(
			js=["js/jquery-ui.min.js", "js/jquery.ui.resizable.snap.ext.js", "js/knockout-sortable.js", "js/consolidatedtabs.js"],
			css=["css/consolidatedtabs.css"]
		)

	##~~ SimpleApiPlugin mixin

	def get_api_commands(self):
		return dict(
			reset_positions=[],
			reset_sizes=[]
		)

	def on_api_command(self, command, data):
		import flask
		if command == "reset_positions":
			self._settings.set(["panel_positions"], {})
			self._settings.save()
			return flask.jsonify(positions_reset=True)
		if command == "reset_sizes":
			self._settings.set(["panel_sizes"], {})
			self._settings.save()
			return flask.jsonify(sizes_reset=True)

	##~~ Softwareupdate hook

	def get_update_information(self):
		return dict(
			consolidatedtabs=dict(
				displayName="Consolidated Tabs",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="jneilliii",
				repo="OctoPrint-ConsolidatedTabs",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/jneilliii/OctoPrint-ConsolidatedTabs/archive/{target_version}.zip"
			)
		)


__plugin_name__ = "Consolidated Tabs"
__plugin_pythoncompat__ = ">=2.7,<4"  # python 2 and 3


def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = ConsolidatedtabsPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}

	global __plugin_settings_overlay__
	__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=["plugin_consolidatedtabs"]))))
