ko.bindingHandlers.gridStack = {
	helpers: {
		cloneNodes: function (nodesArray, shouldCleanNodes) {
			for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
				var clonedNode = nodesArray[i].cloneNode(true);
				newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
			}
			return newNodesArray;
		}
	},
	init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
		var $element = $(element);
		var gridItems = [];
		var fromObs = false;
		var template = ko.bindingHandlers.gridStack.helpers.cloneNodes(element.getElementsByClassName('grid-stack-item'), true);
		ko.virtualElements.emptyNode(element);

		var timeout;
		var grid = $element.gridstack(ko.utils.extend(ko.unwrap(valueAccessor().settings) || {}, {
			auto: true
		})).data('gridstack');

		$element.on('change', function (eve, items) {
			if (!fromObs) {
				if (timeout) {
					clearTimeout(timeout);
				}
				timeout = setTimeout(function () {
					for (var i = 0; i < gridItems.length; i++) {
						var item = gridItems[i];
						var from = {
							x: ko.unwrap(item.item.x),
							y: ko.unwrap(item.item.y),
							width: ko.unwrap(item.item.width),
							height: ko.unwrap(item.item.height)
						};
						var to = {
							x: parseInt(item.element.getAttribute("data-gs-x")),
							y: parseInt(item.element.getAttribute("data-gs-y")),
							width: parseInt(item.element.getAttribute("data-gs-width")),
							height: parseInt(item.element.getAttribute("data-gs-height"))
						};

						if (from.x != to.x )
						 {   if(ko.isWritableObservable(item.item.x)) {
								item.item.x(to.x);
							}else if(!ko.isObservable()){
								item.item.x = to.x;
							}
						}

						if (from.y != to.y) {
							if (ko.isWritableObservable(item.item.y)) {
								item.item.y(to.y);
							} else if (!ko.isObservable()) {
								item.item.y = to.y;
							}
						}

						if (from.width != to.width) {
							if (ko.isWritableObservable(item.item.width)) {
								item.item.width(to.width);
							} else if (!ko.isObservable()) {
								item.item.width = to.width;
							}
						}

						if (from.height != to.height) {
							if (ko.isWritableObservable(item.item.height)) {
								item.item.height(to.height);
							} else if (!ko.isObservable()) {
								item.item.height = to.height;
							}
						}
					}
				}, 10);

			}
		});

		ko.computed({
			read: function () {
				fromObs = true;
				var widgets = ko.unwrap(valueAccessor().widgets);
				var newGridItems = [];

				for (var i = 0; i < gridItems.length; i++) {
					var item = ko.utils.arrayFirst(widgets, function (w) { return w == gridItems[i].item; });
					if (item == null) {
						grid.removeWidget(gridItems[i].element);
						ko.cleanNode(gridItems[i].element);
					} else {
						newGridItems.push(gridItems[i]);
					}
				}

				for (var i = 0; i < widgets.length; i++) {
					var item = ko.utils.arrayFirst(gridItems, function (w) { return w.item == widgets[i]; });
					if (item == null) {
						var innerBindingContext = bindingContext['createChildContext'](widgets[i]);
						var itemElement = ko.bindingHandlers.gridStack.helpers.cloneNodes(template)[0];
						grid.addWidget(itemElement, ko.unwrap(widgets[i].x), ko.unwrap(widgets[i].y), ko.unwrap(widgets[i].width), ko.unwrap(widgets[i].height), true);
						ko.applyBindings(innerBindingContext, itemElement)
						newGridItems.push({ item: widgets[i], element: itemElement });
					} else {
						var to = {
							x: ko.unwrap(widgets[i].x),
							y: ko.unwrap(widgets[i].y),
							width: ko.unwrap(widgets[i].width),
							height: ko.unwrap(widgets[i].height)
						};
						var from = {
							x: parseInt(item.element.getAttribute("data-gs-x")),
							y: parseInt(item.element.getAttribute("data-gs-y")),
							width: parseInt(item.element.getAttribute("data-gs-width")),
							height: parseInt(item.element.getAttribute("data-gs-height"))
						};

						if (from.x != to.x || from.y != to.y) {
							grid.move(item.element, to.x, to.y);
						}

						if (from.width != to.width || from.height != to.height) {
							grid.resize(item.element, to.width, to.height);
						}
					}
				}
				gridItems = newGridItems;

				fromObs = false;
			},
			disposeWhenNodeIsRemoved: element
		}).extend({ deferred:true });


		ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
			gridStack.destroy();
		});

		return { 'controlsDescendantBindings': true };
	}
};