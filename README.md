# Consolidated Tabs

This plugin will allow you to combine the selected tabs into a single tab as draggable and resizable panels. Click the screenshot below to see an example YouTube video.

[![screenshot tab](screenshot_tab.png)](https://www.youtube.com/watch?v=fd2xVNUORg8)

**Note:** Initial positioning and sizing can be difficult due to the relative positioning of the panels. You may have to drag/resize and refresh the page a couple of times to get everything perfectly aligned. See [Tips](#Tips) for more information.

## Setup

Install via the bundled [Plugin Manager](https://docs.octoprint.org/en/master/bundledplugins/pluginmanager.html)
or manually using this URL:

    https://github.com/jneilliii/OctoPrint-ConsolidatedTabs/archive/master.zip

## Settings

Click the screenshot below to open a YouTube video demonstrating setting up Consolidated Tabs.

[![screenshot settings](screenshot_settings.png)](https://www.youtube.com/watch?v=rrzeOJF2u4A)

- **Snap to Edges While Dragging:** if enabled panels will snap to the edges of other panels while dragging.
- **Combined Tabs Order:** all the tabs that will be combined into one tab as a panel.
- **Uncombined Tabs:** tabs that have not been combined and will remain as their own tab.
- **Resize Navbar:** whether to resize the width of the top navbar to 100% or not.
- **Remove Tab Name:** don't show the name of the consolidated tab, only possible if all tabs are combined.
- **Use Full Width of Browser:** if enabled the tab area will be sized to fit the entire width of the browser and the sidebar will be moved to the left.
- **Clear All Positions and Sizes:** use the buttons to clear all position or size customizations, helpful when panels get moved off screen.

## Tips

- The name of the tab will match what is configured in OctoPrint's `Title` appearance setting.

- The best way to get your panels sized and positioned is to order them in the plugin's settings first in the order that you want the panels to be in the consolidated tab. The panels will wrap from left to right and top to bottom in that order.

- Hold down the shift key on your keyboard and click anywhere on a panel (typically in blank space or on header) to activate it. Once activated you can let go of the shift key.
  - Move panels by clicking and dragging the panel header.
  - Resize panels by clicking and dragging the edges of the panel.
  - Once finished click any panel to deactivate the currently active panel.

- Each panel is positioned relative to the panel that precedes it in settings, and as a result resizing a panel will cause the other panels to move, and potentially wrap if they extend past the containing tab.

- There are circumstances in which a panel may jump out of view while dragging/resizing panels. If this happens you can use the `Clear Positions` button in the plugin's settings to make all the panels realign to each other.

## Themeify

If using Themeify you will want to add extra settings to your Advanced options. These are the relevant css selectors that you will need to adjust.

![screenshot themeify](screenshot_themeify.png)

## To-Do
* [ ] Figure out how to get rid of the extra whitespace at the bottom of the page after panels are positioned.
* [ ] Figure out how to get temp panel to be selected when drop-downs are selected.
* [X] ~~Add YouTube video showing placement and resizing of tabs.~~

## Most Recent Release

**[0.1.3](https://github.com/jneilliii/OctoPrint-ConsolidatedTabs/releases/tag/0.1.3)** (11/21/2020)

**Added**

* release channels for OctoPrint 1.5.0+ for future rc testing, similar to OctoPrint as described [here](https://community.octoprint.org/t/how-to-use-the-release-channels-to-help-test-release-candidates/402)

**Updated**

* knockout sortable library for OctoPrint 1.5.0 compatibility

**Fixed**

* allow selecting contents of terminal tab
* couple of tweaks related to Pretty GCode plugin

### [All Releases](https://github.com/jneilliii/OctoPrint-ConsolidatedTabs/releases)

## Get Help

If you experience issues with this plugin or need assistance please use the issue tracker by clicking issues above.

## Additional Plugins

Check out my other plugins [here](https://plugins.octoprint.org/by_author/#jneilliii)

## Sponsors
- Andreas Lindermayr
- [@Mearman](https://github.com/Mearman)
- [@TxBillbr](https://github.com/TxBillbr)
- Gerald Dachs
- [@TheTuxKeeper](https://github.com/thetuxkeeper)
- @tideline3d
- [SimplyPrint](https://simplyprint.dk/)
- [Andrew Beeman](https://github.com/Kiendeleo)
- [Calanish](https://github.com/calanish)
- [Will O](https://github.com/4wrxb)

## Support My Efforts
I, jneilliii, programmed this plugin for fun and do my best effort to support those that have issues with it, please return the favor and leave me a tip or become a Patron if you find this plugin helpful and want me to continue future development.

[![Patreon](patreon-with-text-new.png)](https://www.patreon.com/jneilliii) [![paypal](paypal-with-text.png)](https://paypal.me/jneilliii)

<small>No paypal.me? Send funds via PayPal to jneilliii&#64;gmail&#46;com

You can use [this](https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=jneilliii@gmail.com) link too. But the normal PayPal fee will be deducted.
</small>
