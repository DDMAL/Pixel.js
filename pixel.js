/**
 * This plugin will be used to transform Diva into a layering tool which will be used to provide
 * the ground truth data for the machine learning algorithm
 * that classifies and isolates the different components of old manuscripts and scores.
 *
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
 *
 **/
export default class PixelPlugin
{
    constructor (core)
    {
        this.core = core;
        this.drawHighlights();
    }

    // Is called every time visible tiles are loaded to draw highlights on top of them
    drawHighlights()
    {
        let core = this.core;

        Diva.Events.subscribe('VisibleTilesDidLoad', function (pageIndex, zoomLevel)
        {
            let renderer = core.getSettings().renderer;
            let scaleRatio = Math.pow(2,zoomLevel);
            const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
            const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

            // Setup the rectangle to draw (These will be passed in an array afterwards)
            // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
            var absoluteRectWidth = 24;
            var absoluteRectHeight = 24;
            var absoluteRectOriginX = 23;
            var absoluteRectOriginY = 42;

            // The relative values are used to scale the highlights according to the zoom level on the page itself
            var relativeRectWidth = absoluteRectWidth * scaleRatio;
            var relativeRectHeight = absoluteRectHeight * scaleRatio;
            var relativeRectOriginX = absoluteRectOriginX * scaleRatio;
            var relativeRectOriginY = absoluteRectOriginY * scaleRatio;

            // This indicates the page on top of which the highlights are supposed to be drawn
            var highlightPageIndex = 0;

            if (pageIndex === highlightPageIndex){
                // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
                // (to make it look like it is on top of a page in Diva)
                var highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + relativeRectOriginX;
                var highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + relativeRectOriginY;

                //Draw the rectangle
                renderer._ctx.fillStyle = "rgba(255, 255, 0, 0.25)";
                renderer._ctx.fillRect(highlightXOffset, highlightYOffset,relativeRectWidth,relativeRectHeight);
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
