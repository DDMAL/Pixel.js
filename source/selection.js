export class Selection
{
    constructor ()
    {
        this.selectedLayer = null;
        this.selectedShape = null;
        this.imageData = null;
    }

    copyShape (maxZoomLevel)
    {
        this.selectedLayer.removeShapeFromLayer(this.selectedShape);
        this.selectedLayer.drawLayer(maxZoomLevel, this.selectedLayer.getCanvas());

        let scaleRatio = Math.pow(2, maxZoomLevel);

        // Get coordinates of the selection shape (a rectangle here)
        let absoluteRectOriginX = this.selectedShape.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.selectedShape.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.selectedShape.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.selectedShape.relativeRectHeight * scaleRatio;

        let selectedLayerCtx = this.selectedLayer.getCanvas().getContext("2d");
        let imageData = selectedLayerCtx.getImageData(absoluteRectOriginX, absoluteRectOriginY, absoluteRectWidth, absoluteRectHeight);

        this.imageData = imageData;
    }

    cutShape (maxZoomLevel)
    {
        this.selectedLayer.removeShapeFromLayer(this.selectedShape);
        this.selectedLayer.drawLayer(maxZoomLevel, this.selectedLayer.getCanvas());

        let scaleRatio = Math.pow(2, maxZoomLevel);

        // Get coordinates of the selection shape (a rectangle here)
        let absoluteRectOriginX = this.selectedShape.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.selectedShape.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.selectedShape.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.selectedShape.relativeRectHeight * scaleRatio;

        let selectedLayerCtx = this.selectedLayer.getCanvas().getContext("2d");
        let imageData = selectedLayerCtx.getImageData(absoluteRectOriginX, absoluteRectOriginY, absoluteRectWidth, absoluteRectHeight);

        this.imageData = imageData;

        console.log(imageData.data);

        this.selectedShape.changeBlendModeTo("subtract");
        this.selectedLayer.addShapeToLayer(this.selectedShape);
        this.selectedLayer.drawLayer(maxZoomLevel, this.selectedLayer.getCanvas());
    }

    /**
     * Must redraw layer after calling
     * @param layerToPasteTo
     * @param maxZoomLevel
     */
    pasteShapeToLayer (layerToPasteTo)
    {
        let data = this.imageData.data;

        // Change imageData colour to layer's colour
        for(let i = 0; i < data.length; i += 4)
        {
            data[i] = layerToPasteTo.colour.red;             // red
            data[i + 1] = layerToPasteTo.colour.green;       // green
            data[i + 2] = layerToPasteTo.colour.blue;        // blue
        }

        layerToPasteTo.addToPastedRegions(this);
    }

    setSelectedShape (selectedShape, selectedLayer)
    {
        this.selectedShape = selectedShape;
        this.selectedLayer = selectedLayer;
    }

    clearSelection (maxZoomLevel)
    {
        if (this.selectedLayer !== null && this.selectedShape !== null)
        {
            this.selectedLayer.removeShapeFromLayer(this.selectedShape);
            this.selectedLayer.drawLayer(maxZoomLevel, this.selectedLayer.getCanvas());
        }
    }

    drawOnPage (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2, zoomLevel);

        // Get coordinates of the selection shape (a rectangle here)
        let absoluteRectOriginX = this.selectedShape.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.selectedShape.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.selectedShape.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.selectedShape.relativeRectHeight * scaleRatio;

        let xmin = Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth);
        let ymin = Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight);

        let pasteCanvas = document.createElement("canvas");
        pasteCanvas.width = absoluteRectWidth;
        pasteCanvas.height = absoluteRectHeight;

        pasteCanvas.getContext("2d").putImageData(this.imageData, 0, 0);

        canvas.getContext("2d").drawImage(pasteCanvas, xmin, ymin);
    }
}
