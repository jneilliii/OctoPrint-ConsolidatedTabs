(function() {
'use strict';

ko.components.register('gridstack', {
    viewModel: {
        createViewModel: function(controller, componentInfo) {
            var ViewModel = function(controller, componentInfo) {
                var grid = null,
                    gridstack = $('.grid-stack'),
                    gridstackWidth = gridstack.width(),
                    widgetHeight = (gridstackWidth / 12) - 5;

                this.widgets = controller.widgets;

                this.afterAddWidget = function(items) {
                    _.each(items, function(item) {
                        item = $(item);

                        if (item.data('_gridstack_node') || item[0].nodeType !== 1) {
                            return;
                        }

                        if (grid == null) {
                            grid = $(componentInfo.element).find('.grid-stack').gridstack({
                                auto: false,
                                animate: true,
                                cell_height: widgetHeight,
                                handle: '.editing-options .handle',
                                vertical_margin: 10
                            }).data('gridstack');
                        }

                        grid.add_widget(item);
                        ko.utils.domNodeDisposal.addDisposeCallback(item[0], function() {
                            grid.remove_widget(item);
                        });
                    }, this);
                };

                $(componentInfo.element).find('.grid-stack').on('resizestop', function(event, ui) {
                    setTimeout(function() { // necessary as resizestop fires slightly too early
                        _.each(Highcharts.charts, function(chart) {
                            if (chart) {
                                chart.reflow();
                            }
                        });
                    }, 10);

                    // TODO: update viewmodel rect values after resizestop
                });

                $(componentInfo.element).find('.grid-stack').on('dragstop', function(event, ui) {
                    // TODO: update viewmodel rect values after dragstop
                });
            };

            return new ViewModel(controller, componentInfo);
        }
    },
    template:
    [
        '<div class="grid-stack" data-bind="foreach: {data: widgets, afterRender: afterAddWidget}">' +
            '<div class="grid-stack-item" data-bind="attr: { \'data-gs-x\': x, \'data-gs-y\': y, \'data-gs-width\': width, \'data-gs-height\': height, \'data-gs-min-height\': rect.minHeight, \'data-gs-max-height\': rect.maxHeight, \'data-gs-min-width\': rect.minWidth, \'data-gs-max-width\': rect.maxWidth }">' +
                '<div class="grid-stack-item-content">' +
                    '<h3>' +
                        '<span data-bind="text: title"></span>' +
                        '<span class="link float--right" data-bind="click: $root.removeTile">x</span>' +
                    '</h3>' +
                    '<img src="Content/images/loading.gif" data-bind="visible: isLoading()" class="loading" />' +
                    '<!-- ko if: editMode -->' +
                    '<div class="tile-options">' +
                        '<div class="row">' +
                            '<label>Title <input type="text" class="text-input" data-bind="value: title" /></label>' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>View <select data-bind="options: $root.views, optionsText: \'ViewName\', optionsCaption: \'Choose a view\', value: selectedView" class="text-input"></select>' +
                            '</label>' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>Table/Chart <select class="text-input" data-bind="options: (selectedView() || {}).Charts, optionsText: \'ChartName\', value: selectedChart"></select>' +
                            '</label>' +
                        '</div>' +
                        '<div class="row">' +
                            '<button type="button" class="btn btn--small" data-bind="click: $root.saveTile">Save Tile</button> or <span class="link" data-bind="click: $root.cancelTile">Cancel</span>' +
                        '</div>' +
                    '</div>' +
                    '<!-- /ko -->' +
                    '<div data-bind="chart: chart" class="fill"></div>' +
                    '<div class="editing-options">' +
                        '<span class="handle"><i class="icon icon-drag"></i> Drag to Move </span>' +
                        '<span data-bind="click: $root.editTile, visible: !editMode()" class="link">Edit </span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'
    ].join('\n')
});
})();
