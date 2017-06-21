export class Path
{
    constructor (brushSize, blendMode)
    {
        this.points = [];
        this.brushSize = brushSize;
        this.type = "path";
<<<<<<< HEAD
        this.mode = blendMode;
=======
        this.blendMode = blendMode;
        this.lastAbsX = 0;
        this.lastAbsY = 0;
>>>>>>> develop
    }

    addPointToPath (point)
    {
        this.points.push(point);
    }

    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let isDown = false;
        this.points.forEach((point) => {
            this.connectPoint(layer, point, pageIndex, zoomLevel, isDown, renderer, canvas, "viewport");
            isDown = true;
        });
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let isDown = false;
        this.points.forEach((point) => {
            this.connectPoint(layer, point, pageIndex, zoomLevel, isDown, renderer, canvas, "page");
            isDown = true;
        });
    }

    connectPoint (layer, point, pageIndex, zoomLevel, isDown, renderer, canvas, coordinatesSystem)
    {
        let scaleRatio = Math.pow(2, zoomLevel),
            ctx = canvas.getContext('2d');

        if (pageIndex !== point.pageIndex)
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let coordinates;
        switch (coordinatesSystem)
        {
            case "viewport":
                coordinates = point.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
                break;
            case "page":
                coordinates = point.getAbsoluteCoordinates(zoomLevel);
                break;
            default:
                coordinates = point.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        }

        let highlightXOffset = coordinates.x,
            highlightYOffset = coordinates.y;

        if (isDown)
        {
            if (this.blendMode === "add")
            {
                ctx.globalCompositeOperation="source-over";
                ctx.beginPath();
                ctx.strokeStyle = layer.colour.toHTMLColour();
                ctx.lineWidth = this.brushSize * scaleRatio;
                ctx.lineJoin = "round";
                ctx.moveTo(this.lastAbsX, this.lastAbsY);
                ctx.lineTo(highlightXOffset, highlightYOffset);
                ctx.closePath();
                ctx.stroke();
            }

            else if (this.blendMode === "subtract")
            {
                ctx.globalCompositeOperation="destination-out";
                ctx.beginPath();
                ctx.strokeStyle = "rgba(250,250,250,1)"; // It is important to have the alpha always equal to 1. RGB are not important when erasing
                ctx.lineWidth = this.brushSize * scaleRatio;
                ctx.lineJoin = "round";
                ctx.moveTo(this.lastAbsX, this.lastAbsY);
                ctx.lineTo(highlightXOffset, highlightYOffset);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalCompositeOperation="source-over";
        }
        this.lastAbsX = highlightXOffset;
        this.lastAbsY = highlightYOffset;
    }
}