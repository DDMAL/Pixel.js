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
        this.activated = false;
        this.pageToolsIcon = this.createIcon();
    }

    // Is called every time visible tiles are loaded to draw highlights on top of them
    drawHighlights()
    {
        //FIXME
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

            if (pageIndex === highlightPageIndex)
            {
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
    /**
     * Enables the layering plugin and stops it from being repetitively called.
     *
     **/
    handleClick (event, settings, publicInstance, pageIndex)
    {
        if (!this.activated)
        {
            this.drawHighlights();
            this.activated = true;
        }
        else
        {
            Diva.Events.unsubscribe('VisibleTilesDidLoad');
        }
    }

    createIcon ()
    {
        const pageToolsIcon = document.createElement('div');
        pageToolsIcon.classList.add('diva-pixel-icon');

        let root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        root.setAttribute("x", "0px");
        root.setAttribute("y", "0px");
        root.setAttribute("viewBox", "0 0 25 25");
        root.id = `${this.core.settings.selector}pixel-icon`;

        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.id = `${this.core.settings.selector}pixel-icon-glyph`;
        g.setAttribute("transform", "matrix(1, 0, 0, 1, -11.5, -11.5)");
        g.setAttribute("class", "diva-pagetool-icon");

        //Placeholder icon
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', '15');
        rect.setAttribute('y', '10');
        rect.setAttribute('width', '25');
        rect.setAttribute('height', 25);

        g.appendChild(rect);
        root.appendChild(g);

        pageToolsIcon.appendChild(root);

        return pageToolsIcon;
    }
}

PixelPlugin.prototype.pluginName = "pixel";
PixelPlugin.prototype.isPageTool = true;

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.PixelPlugin = PixelPlugin;
})(window);
