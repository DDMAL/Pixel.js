import {Shape} from './shape';

export class Line extends Shape
{
    constructor (startPoint, endPoint, lineWidth, lineJoin)
    {
        super(startPoint);
        this.endPoint = endPoint;
        this.lineWidth = lineWidth;
        this.lineJoin = lineJoin;
    }

    getLineEquation ()
    {
        //TODO: Implement function
    }

    /**
     * Calculates the angle of the line.
     * The angle of a horizontal line is 0 degrees, angles increase in the clockwise direction
     * @param zoomLevel
     * @param pageIndex
     * @param renderer
     * @returns {number}
     */
    getAngleRad (zoomLevel, pageIndex, renderer)
    {
        let startPointAbsolutePaddedCoords = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        let endPointAbsolutePaddedCoords = this.endPoint.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        return Math.atan2(endPointAbsolutePaddedCoords.y - startPointAbsolutePaddedCoords.y,
            endPointAbsolutePaddedCoords.x - startPointAbsolutePaddedCoords.x);
    }

    /**
     * Draws a line on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     */
    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        let startPointAbsoluteCoordsWithPadding = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        let endPointAbsoluteCoordsWithPadding = this.endPoint.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        ctx.beginPath();
        ctx.strokeStyle = layer.colour.toHTMLColour();
        ctx.lineWidth = this.lineWidth * scaleRatio;
        ctx.lineJoin = this.lineJoin;
        ctx.moveTo(startPointAbsoluteCoordsWithPadding.x, startPointAbsoluteCoordsWithPadding.y);
        ctx.lineTo(endPointAbsoluteCoordsWithPadding.x, endPointAbsoluteCoordsWithPadding.y);
        ctx.closePath();
        ctx.stroke();
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        let startPointAbsoluteCoords = this.origin.getAbsoluteCoordinates(zoomLevel);
        let endPointAbsoluteCoords = this.endPoint.getAbsoluteCoordinates(zoomLevel);

        ctx.beginPath();
        ctx.strokeStyle = layer.colour.toHTMLColour();
        ctx.lineWidth = this.lineWidth * scaleRatio;
        ctx.lineJoin = this.lineJoin;
        ctx.moveTo(startPointAbsoluteCoords.x, startPointAbsoluteCoords.y);
        ctx.lineTo(endPointAbsoluteCoords.x, endPointAbsoluteCoords.y);
        ctx.closePath();
        ctx.stroke();
    }
}