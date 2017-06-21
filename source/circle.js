import {Shape} from './shape';
import {Point} from './point';
import {Colour} from './colour';

export class Circle extends Shape
{
    constructor (point, relativeRadius) {
        super(point);
        this.relativeRadius = relativeRadius;
    }

    /**
     * Draws the circle on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     * @param canvas
     */
    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let absoluteCenterWithPadding = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

            //Draw the circle
            ctx.fillStyle = layer.colour.toHTMLColour();
            ctx.beginPath();
            ctx.arc(absoluteCenterWithPadding.x,absoluteCenterWithPadding.y, this.relativeRadius * scaleRatio,0,2*Math.PI);
            ctx.fill();
        }
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let absoluteCenter = this.origin.getAbsoluteCoordinates(zoomLevel);

            //Draw the circle
            ctx.fillStyle = layer.colour.toHTMLColour();
            ctx.beginPath();
            ctx.arc(absoluteCenter.x,absoluteCenter.y, this.relativeRadius * scaleRatio,0,2*Math.PI);
            ctx.fill();
        }
    }

    /**
     * * Copies the pixels spanned by the circle from the diva canvas to the canvas passed to it in page coordinates
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
        let circleTop = new Point(this.origin.relativeOriginX, this.origin.relativeOriginY - this.relativeRadius, 0);
        let circleBottom = new Point(this.origin.relativeOriginX, this.origin.relativeOriginY + this.relativeRadius, 0);
        let circleLeft = new Point(this.origin.relativeOriginX - this.relativeRadius, this.origin.relativeOriginY, 0);
        let circleRight = new Point(this.origin.relativeOriginX + this.relativeRadius, this.origin.relativeOriginY, 0);

        let pixelCtx = canvas.getContext('2d');
        let divaCtx = divaCanvas.getContext('2d');

        let scaleRatio = Math.pow(2, zoomLevel);

        for(var y = circleTop.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).y;
            y <= circleBottom.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).y; y++)
        {
            for(var  x = circleLeft.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).x;
                x <= circleRight.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).x; x++){
                let point1highlightOffset = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

                let shiftedX = x - point1highlightOffset.x;
                let shiftedY = y - point1highlightOffset.y;

                // If it satisfies the circle equation x^2 + y^2 <= r^2
                if(shiftedX * shiftedX + shiftedY * shiftedY <= (this.relativeRadius) * scaleRatio * (this.relativeRadius) * scaleRatio)
                {
                    // Get absolute from padded
                    let absoluteCoords = new Point().getAbsoluteCoordinatesFromPadded(pageIndex,renderer,x,y);

                    // In bounds
                    if (absoluteCoords.y >= 0 && absoluteCoords.x >= 0 && absoluteCoords.y <= canvas.height && absoluteCoords.x <= canvas.width)
                    {
                        if (blendMode === "add")
                        {
                            let paddedCoords = new Point().getPaddedCoordinatesFromAbsolute(pageIndex, renderer, absoluteCoords.x, absoluteCoords.y);
                            let data = divaCtx.getImageData(paddedCoords.x, paddedCoords.y, 1, 1).data;
                            let colour = new Colour(data[0], data[1], data[2], data[3]);

                            pixelCtx.fillStyle = layer.colour.toHTMLColour();
                            pixelCtx.fillRect(absoluteCoords.x, absoluteCoords.y, 1, 1);
                        }

                        else if (blendMode === "subtract")
                        {
                            pixelCtx.clearRect(absoluteCoords.x, absoluteCoords.y, 1, 1);
                        }
                    }
                }
            }
        }
    }
}