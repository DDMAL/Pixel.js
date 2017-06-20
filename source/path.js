export class Path
{
    constructor (brushSize, blendMode)
    {
        this.points = [];
        this.brushSize = brushSize;
        this.type = "path";
        this.blendMode = blendMode;
        this.lastAbsX = 0;
        this.lastAbsY = 0;
    }

    addPointToPath (point)
    {
        this.points.push(point);
    }

    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let isDown = false;
        this.points.forEach((point) => {
            this.connectPoint(layer, point, pageIndex, zoomLevel, isDown, renderer, canvas);
            isDown = true;
        });
    }

    connectPoint (layer, point, pageIndex, zoomLevel, isDown, renderer)
    {
        let canvas = layer.getCanvas();

        let scaleRatio = Math.pow(2, zoomLevel),
            ctx = canvas.getContext('2d');

        if (pageIndex !== point.pageIndex)
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absolutePaddedCoords = point.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        let highlightXOffset = absolutePaddedCoords.x,
            highlightYOffset = absolutePaddedCoords.y;

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

    drawAbsolute (layer, point, pageIndex, zoomLevel, isDown, canvas)
    {
        let scaleRatio = Math.pow(2, zoomLevel),
            ctx = canvas.getContext('2d');

        if (pageIndex !== point.pageIndex)
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteCoords = point.getAbsoluteCoordinates(zoomLevel);

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
                ctx.lineTo(absoluteCoords.x, absoluteCoords.y);
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
                ctx.lineTo(absoluteCoords.x, absoluteCoords.y);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalCompositeOperation="source-over";
        }
        this.lastAbsX = absoluteCoords.x;
        this.lastAbsY = absoluteCoords.y;
    }
}