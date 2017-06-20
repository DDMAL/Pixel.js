import {Shape} from './shape';
import {Circle} from './circle';

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

    /**
     * Gets all the pixels spanned by a round edged line.
     * @param layer
     * @param zoomLevel
     * @param pageIndex
     * @param renderer
     * @param canvas
     * @param divaCanvas
     */
    getPixels (layer, zoomLevel, pageIndex, renderer, canvas, divaCanvas)
    {
        let point1 = this.origin,
            point2 = this.endPoint,
            scaleRatio = Math.pow(2,zoomLevel),
            absoluteLineWidth = this.lineWidth * scaleRatio,
            highlightPageIndex = point1.pageIndex;

        if (pageIndex !== highlightPageIndex)
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let point1highlightOffset = point1.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer),
            point2highlightOffset = point2.getAbsolutePaddedCoordinates(zoomLevel,pageIndex,renderer);

        new Circle(point1, this.lineWidth/2).getPixels(layer, pageIndex, zoomLevel, renderer, canvas, this.blendMode, divaCanvas);
        new Circle(point2, this.lineWidth/2).getPixels(layer, pageIndex, zoomLevel, renderer, canvas, this.blendMode, divaCanvas);

        let ang = this.getAngleRad(zoomLevel,pageIndex,renderer);

        // find the first point on the circumference that is orthogonal
        // to the line intersecting the two circle origos

        // These are values with padding
        var start1 = {
            absolutePaddedX: point1highlightOffset.x + Math.cos(ang + Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point1highlightOffset.y + Math.sin(ang + Math.PI / 2) * absoluteLineWidth / 2
        };
        var end1 = {
            absolutePaddedX: point2highlightOffset.x + Math.cos(ang + Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point2highlightOffset.y + Math.sin(ang + Math.PI / 2) * absoluteLineWidth / 2
        };

        // find the second point on the circumference that is orthogonal
        // to the line intersecting the two circle origos
        var start2 = {
            absolutePaddedX: point1highlightOffset.x + Math.cos(ang - Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point1highlightOffset.y + Math.sin(ang - Math.PI / 2) * absoluteLineWidth / 2
        };
        var end2 = {
            absolutePaddedX: point2highlightOffset.x + Math.cos(ang - Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point2highlightOffset.y + Math.sin(ang - Math.PI / 2) * absoluteLineWidth / 2
        };

        // 1. get ymax and ymin
        let ymax = Math.round(Math.max(start1.absolutePaddedY, start2.absolutePaddedY, end1.absolutePaddedY, end2.absolutePaddedY));
        let ymin = Math.round(Math.min(start1.absolutePaddedY, start2.absolutePaddedY, end1.absolutePaddedY, end2.absolutePaddedY));
        let pairOfEdges = [[start1, end1], [start2, end2], [start1, start2], [end1, end2]];

        // Logic for polygon fill using scan lines
        new Shape().getPixels(layer, pageIndex, zoomLevel, renderer, ymax, ymin, pairOfEdges, canvas, this.blendMode, divaCanvas);
    }
}