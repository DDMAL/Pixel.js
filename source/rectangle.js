import {Shape} from './shape';
import {Colour} from './colour';
import {Point} from './point';

export class Rectangle extends Shape
{
    constructor (point, relativeRectWidth, relativeRectHeight, blendMode) {
        super(point);
        this.relativeRectWidth = relativeRectWidth;
        this.relativeRectHeight = relativeRectHeight;
        this.blendMode = blendMode;
    }

    /**
     * draws a rectangle on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     */
    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        // TODO: Use padded coordinates
        if (this.blendMode === "add")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
                // (to make it look like it is on top of a page in Diva)
                let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX,
                    highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.fillRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
            }
        }

        else if (this.blendMode === "subtract")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
                // (to make it look like it is on top of a page in Diva)
                let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX,
                    highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.clearRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
            }
        }
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        // TODO: Use padded coordinates
        if (this.blendMode === "add")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.fillRect(absoluteRectOriginX, absoluteRectOriginY,absoluteRectWidth,absoluteRectHeight);
            }
        }

        else if (this.blendMode === "subtract")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.clearRect(absoluteRectOriginX, absoluteRectOriginY,absoluteRectWidth,absoluteRectHeight);
            }
        }
    }

    /**
     * * Copies the pixels spanned by the circle from the diva canvas to the canvas passed to it
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     * @param canvas
     * @param blendMode
     * @param divaCanvas
     */
    getPixels (layer, pageIndex, zoomLevel, renderer, canvas, blendMode, divaCanvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let pixelCtx = canvas.getContext('2d');
        let divaCtx = divaCanvas.getContext('2d');

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio;
        let absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio;
        let absoluteRectWidth = this.relativeRectWidth * scaleRatio;
        let absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        if (pageIndex === this.origin.pageIndex)
        {
            // Want abs coord of start and finish
            // let top = Math.round(Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight));
            // let bottom = Math.max(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight);

            for(var row = Math.round(Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight)); row <  Math.max(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight); row++)
            {
                for(var col = Math.round(Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth)); col < Math.max(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth); col++)
                {
                    if (row >= 0 && col >= 0 && row <= canvas.height && col <= canvas.width)
                    {
                        if (blendMode === "add")
                        {
                            let paddedCoords = new Point().getPaddedCoordinatesFromAbsolute(pageIndex, renderer, col, row);
                            let data = divaCtx.getImageData(paddedCoords.x, paddedCoords.y, 1, 1).data;
                            let colour = new Colour(data[0], data[1], data[2], data[3]);

                            pixelCtx.fillStyle = colour.toHTMLColour();
                            pixelCtx.fillRect(col, row, 1, 1);
                        }

                        else if (blendMode === "subtract")
                        {
                            pixelCtx.clearRect(col, row, 1, 1);
                        }
                    }
                }
            }
        }
    }
}
