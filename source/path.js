export class Path
{
    constructor (brushSize, blendMode)
    {
        this.points = [];
        this.brushSize = brushSize;
        this.type = "path";
        this.mode = blendMode;
    }

    addPointToPath (point)
    {
        this.points.push(point);
    }

    draw ()
    {

    }
}