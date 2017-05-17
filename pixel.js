/**
 * This plugin will be used to transform Diva into a layering tool which will be used to provide
 * the ground truth data for the machine learning algorithm
 * that classifies and isolates the different components of old manuscripts and scores.
 *
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
 *
 * @method drawHighlights - Used to highlight pages after the tiles are visible
 *
 *
 **/
export default class PixelPlugin
{
    constructor (core)
    {
        this.core = core;
        this.drawHighlights();
    }

    drawHighlights(){
        var core = this.core;

        Diva.Events.subscribe('VisibleTilesDidLoad', function (pageIndex, zoomLevel) {
            var renderer = core.getSettings().renderer;

            const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
            const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

            renderer._ctx.fillStyle = "rgba(255, 255, 0, 0.25)";
            var rectWidth = 24 * Math.pow(2,zoomLevel);
            var rectHeight = 24 * Math.pow(2,zoomLevel);

            var clickX = 23 * Math.pow(2,zoomLevel);
            var clickY = 42 * Math.pow(2,zoomLevel);
            var highlightPageIndex = 0;

            if (pageIndex === highlightPageIndex){
                var highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + clickX;
                var highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + clickY;

                renderer._ctx.fillRect(highlightXOffset, highlightYOffset,rectWidth,rectHeight)

                renderer._ctx.fillStyle = "rgba(50, 0, 255, 0.2)";
                var rectWidth = 55 * Math.pow(2,zoomLevel);
                var rectHeight = 5 * Math.pow(2,zoomLevel);

                var clickX = 48 * Math.pow(2,zoomLevel);
                var clickY = 50 * Math.pow(2,zoomLevel);
                var highlightPageIndex = 0;

                var highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + clickX;
                var highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + clickY;

                renderer._ctx.fillRect(highlightXOffset, highlightYOffset,rectWidth,rectHeight)
            }

            renderer._ctx.fillStyle = "rgba(100, 255, 50, 0.25)";
            var rectWidth = 24 * Math.pow(2,zoomLevel);
            var rectHeight = 24 * Math.pow(2,zoomLevel);

            var clickX = 23 * Math.pow(2,zoomLevel);
            var clickY = 42 * Math.pow(2,zoomLevel);
            var highlightPageIndex = 1;

            if (pageIndex === highlightPageIndex){
                var rectWidth = 80 * Math.pow(2,zoomLevel);
                var rectHeight = 5 * Math.pow(2,zoomLevel);

                var clickX = 36 * Math.pow(2,zoomLevel);
                var clickY = 80 * Math.pow(2,zoomLevel);
                var highlightPageIndex = 0;

                var highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + clickX;
                var highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + clickY;

                renderer._ctx.fillRect(highlightXOffset, highlightYOffset,rectWidth,rectHeight)
            }
        });
    }
}

PixelPlugin.prototype.pluginName = "pixel";

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.PixelPlugin = PixelPlugin;
})(window);
