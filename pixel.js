/**
 * This plugin will be used to transform Diva into a layering tool which will be used to provide
 * the ground truth data for the machine learning algorithm
 * that classifies and isolates the different components of old manuscripts and scores.
 *
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
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
        this.handle = null;
    }

    /**
     * Is called every time visible tiles are loaded to draw highlights on top of them
     *
     * @param highlights, an array of HighlightArea objects that indicate places on a page to highlight
     * @returns A handle for the event subscription
     */
    drawHighlights(highlights)
    {
        let core = this.core;

        // This function is only called once (drawHighlights) so it will store the info that were passed the first time drawHighlights was called (Need a fix)
        var handle = Diva.Events.subscribe('VisibleTilesDidLoad', function (args)
        {
            var pageIndex = args[0],
                zoomLevel = args[1];

            highlights.forEach((highlighted) =>
                {
                    let opacity = 0.25;
                    let renderer = core.getSettings().renderer;
                    let scaleRatio = Math.pow(2,zoomLevel);

                    const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
                    const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

                    // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
                    // The relative values are used to scale the highlights according to the zoom level on the page itself
                    let absoluteRectOriginX = highlighted.relativeRectOriginX * scaleRatio;
                    let absoluteRectOriginY = highlighted.relativeRectOriginY * scaleRatio;
                    let absoluteRectWidth = highlighted.relativeRectWidth * scaleRatio;
                    let absoluteRectHeight = highlighted.relativeRectHeight * scaleRatio;

                    // This indicates the page on top of which the highlights are supposed to be drawn
                    let highlightPageIndex = highlighted.pageIndex;

                    if (pageIndex === highlightPageIndex)
                    {
                        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
                        // (to make it look like it is on top of a page in Diva)
                        let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX;
                        let highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

                        //Draw the rectangle
                        let rgba = null;
                        switch (highlighted.layerType){
                            case 0:
                                rgba = "rgba(51, 102, 255, " + opacity + ")";
                                break;
                            case 1:
                                rgba = "rgba(255, 51, 102, " + opacity + ")";
                                break;
                            case 2:
                                rgba = "rgba(255, 255, 10, " + opacity + ")";
                                break;
                            case 3:
                                rgba = "rgba(10, 255, 10, " + opacity + ")";
                                break;
                            case 4:
                                rgba = "rgba(120, 0, 120, " + opacity + ")";
                                break;
                            default:
                                rgba = "rgba(255, 0, 0, " + opacity + ")";
                        }
                        renderer._ctx.fillStyle = rgba;
                        renderer._ctx.fillRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
                    }
                }
            )
        });
        return handle;
    }

    /**
     * Enables the layering plugin and stops it from being repetitively called.
     *
     **/
    handleClick (event, settings, publicInstance, pageIndex)
    {
        if (!this.activated)
        {
            // Create the array of highlights to pass to drawHighlights function
            let highlight1 = new HighlightArea(23, 42, 24, 24, 0, 0);
            let highlight2 = new HighlightArea(48, 50, 57, 5, 0, 1);
            let highlight3 = new HighlightArea(75, 80, 30, 10, 0, 2);
            let highlight4 = new HighlightArea(21, 77, 12, 13.5, 0, 3);
            let highlight5 = new HighlightArea(50, 120, 50, 10, 0, 4);
            let highlight6 = new HighlightArea(30, 180, 60, 20, 0, 5);
            let highlighted = [highlight1, highlight2, highlight3, highlight4, highlight5, highlight6];
            this.handle = this.drawHighlights(highlighted);
            this.core.getSettings().renderer._paint();  // Repaint the tiles to retrigger VisibleTilesDidLoad
            this.activated = true;
        }
        else
        {
            Diva.Events.unsubscribe(this.handle);
            this.core.getSettings().renderer._paint(); // Repaint the tiles to make the highlights disappear off the page
            this.activated = false;
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

export class HighlightArea
{
    constructor (relativeRectOriginX, relativeRectOriginY, relativeRectWidth, relativeRectHeight, pageIndex, layerType)
    {
        this.relativeRectOriginX = relativeRectOriginX;
        this.relativeRectOriginY = relativeRectOriginY;
        this.relativeRectWidth = relativeRectWidth;
        this.relativeRectHeight = relativeRectHeight;
        this.pageIndex = pageIndex;
        this.layerType = layerType;
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
