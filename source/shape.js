import {Point} from './point';

export class Shape
{
    constructor (point)
    {
        this.origin = point;
        this.type = "shape";
    }

    /**
     * Abstract method, to be implemented by extending function
     */
    draw ()
    {

    }

    drawAbsolute ()
    {

    }

    /**
     * General path drawing on canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     * @param ymax
     * @param ymin
     * @param pairOfEdges
     * @param canvas
     * @param blendMode
     * @param divaCanvas
     */
    getPixels(layer, pageIndex, zoomLevel, renderer, ymax, ymin, pairOfEdges, canvas, blendMode, divaCanvas, matrix)
    {
        // TODO: Check for horizontal or vertical lines
        // For every scan line
        for(var y = ymin; y < ymax; y++)
        {
            let intersectionPoints = [];

            // For every line calculate the intersection edges
            for (var e = 0; e < pairOfEdges.length; e++)
            {
                // Calculate intersection with line
                for(var p = 0; p < pairOfEdges[e].length - 1; p++)
                {
                    let x1 = pairOfEdges[e][p].absolutePaddedX;
                    let y1 = pairOfEdges[e][p].absolutePaddedY;
                    let x2 = pairOfEdges[e][p + 1].absolutePaddedX;
                    let y2 = pairOfEdges[e][p + 1].absolutePaddedY;

                    let deltax = x2 - x1;
                    let deltay = y2 - y1;

                    let x = x1 + deltax / deltay * (y - y1);
                    let roundedX = Math.round(x);

                    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y))
                    {
                        intersectionPoints.push({
                            absolutePaddedX: roundedX,
                            absolutePaddedY: y
                        });
                    }
                }
            }

            intersectionPoints.sort((a, b) => {
                return a.absolutePaddedX - b.absolutePaddedX;
            });

            if (intersectionPoints.length <= 0)
                return;

            // Start filling
            for (var index = 0; index < intersectionPoints.length - 1; index++)
            {
                // Draw from the first intersection to the next, stop drawing until you see a new intersection line
                if (index % 2 === 0)
                {
                    let start = intersectionPoints[index].absolutePaddedX; // This will contain the start of the x coords to fill
                    let end = intersectionPoints[index + 1].absolutePaddedX;    // This will contain the end of the x coords to fill
                    let y = intersectionPoints[index].absolutePaddedY;

                    for (var fill = start; fill < end; fill++)
                    {
                        // Remove padding to get absolute coordinates
                        let absoluteCoords = new Point().getAbsoluteCoordinatesFromPadded(pageIndex,renderer,fill,y);

                        // Necessary check because sometimes the brush draws outside of a page because of brush width
                        if (absoluteCoords.y >= 0 && absoluteCoords.x >= 0 && absoluteCoords.y <= matrix.length && absoluteCoords.x <= matrix[0].length)
                        {
                            matrix[absoluteCoords.y][absoluteCoords.x] = layer.layerId;
                        }
                    }
                }
            }
        }
    }
}