import {Colour} from './colour';
import {Point} from './point';

export class Export {
    constructor(pixelInstance, layers, pageIndex, zoomLevel, uiManager) {
        this.pixelInstance = pixelInstance;
        this.layers = layers;
        this.exportLayersCount = layers.length;
        this.interrupted = false;
        this.dataCanvases = [];
        this.pageIndex = pageIndex;
        this.zoomLevel = zoomLevel;
        this.matrix = null;
        this.uiManager = uiManager;
    }

    /**
     * Creates a PNG for each layer where the pixels spanned by the layers are replaced by the actual image data
     * of the Diva page
     */
    exportLayersAsImageData() {
        this.dataCanvases = [];

        let height = this.pixelInstance.core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).height,
            width = this.pixelInstance.core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).width;

        let progressCanvas = this.uiManager.createExportElements(this).progressCanvas;

        // The idea here is to draw each layer on a canvas and scan the pixels of that canvas to fill the matrix
        this.layers.forEach((layer) => {
            let layerCanvas = document.createElement('canvas');
            layerCanvas.setAttribute("class", "export-page-canvas");
            layerCanvas.setAttribute("id", "layer-" + layer.layerId + "-export-canvas");
            layerCanvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
            layerCanvas.width = width;
            layerCanvas.height = height;

            layer.drawLayerInPageCoords(this.zoomLevel, layerCanvas, this.pageIndex);

            let pngCanvas = document.createElement('canvas');
            pngCanvas.setAttribute("class", "export-page-data-canvas");
            pngCanvas.setAttribute("id", "layer-" + layer.layerId + "-export-canvas");
            pngCanvas.setAttribute("value", layer.layerName);
            pngCanvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
            pngCanvas.width = width;
            pngCanvas.height = height;

            this.dataCanvases.push(pngCanvas);
            this.replaceLayerWithImageData(this.pixelInstance.core.getSettings().renderer._canvas, pngCanvas, this.pageIndex, layerCanvas, progressCanvas);
        });
    }

    /**
     * Creates a PNG for each layer where the pixels spanned by the layers are replaced by the actual image data
     * of the Diva page
     */
    exportLayersAsCSV() {
        let core = this.pixelInstance.core,
            height = core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).height,
            width = core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).width;

        let progressCanvas = this.uiManager.createExportElements(this).progressCanvas;
        this.initializeMatrix();
        this.exportLayersCount = this.layers.length;

        // The idea here is to draw each layer on a canvas and scan the pixels of that canvas to fill the matrix
        this.layers.forEach((layer) => {
            let layerCanvas = document.createElement('canvas');
            layerCanvas.setAttribute("class", "export-page-canvas");
            layerCanvas.setAttribute("id", "layer-" + layer.layerId + "-export-canvas");
            layerCanvas.width = width;
            layerCanvas.height = height;

            layer.drawLayerInPageCoords(this.zoomLevel, layerCanvas, this.pageIndex);
            this.fillMatrix(layer, this.matrix, layerCanvas, progressCanvas);
        });
    }

    /**
     * Creates a PNG for each layer where the pixels spanned by the layers are replaced by the layer colour
     */
    exportLayersAsHighlights() {
        let core = this.pixelInstance.core,
            height = core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).height,
            width = core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).width;

        // The idea here is to draw each layer on a canvas and scan the pixels of that canvas to fill the matrix
        this.layers.forEach((layer) => {
            let layerCanvas = document.createElement('canvas');
            layerCanvas.setAttribute("class", "export-page-canvas");
            layerCanvas.setAttribute("id", "layer-" + layer.layerId + "-export-canvas");
            layerCanvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
            layerCanvas.width = width;
            layerCanvas.height = height;

            layer.drawLayerInPageCoords(this.zoomLevel, layerCanvas, this.pageIndex);

            let png = layerCanvas.toDataURL('image/png');

            let text = document.createTextNode("Download " + layer.layerName + " PNG ");
            let link = document.getElementById(layer.layerName + "-png-download");
            if (link === null)
            {
                link = document.createElement("a");
                link.appendChild(text);
                document.body.appendChild(link);
            }
            // Browsers that support HTML5 download attribute
            link.setAttribute("class", "export-download");
            link.setAttribute("id", layer.layerName + "-png-download");
            link.setAttribute("href", png);
            link.setAttribute("download", layer.layerName);

        });
    }

    /**
     * Scans the canvas that it was initialized with and replaces its pixels with the actual image data from a divaCanvas
     * @param divaCanvas
     * @param drawingCanvas
     * @param pageIndex
     */
    replaceLayerWithImageData(divaCanvas, drawingCanvas, pageIndex, canvasToScan, progressCanvas) {
        let chunkSize = canvasToScan.width,
            chunkNum = 0,
            row = 0,
            col = 0,
            pixelCtx = canvasToScan.getContext('2d'),
            renderer = this.pixelInstance.core.getSettings().renderer;

        // Necessary for doing computation without blocking the UI
        let doChunk = () => {
            let cnt = chunkSize;
            chunkNum++;

            // This simulates a nested for loop that is limited by a certain number of iterations (cnt)
            while (cnt--) {
                if (row >= canvasToScan.height)
                    break;

                if (col < canvasToScan.width) {
                    let data = pixelCtx.getImageData(col, row, 1, 1).data;
                    let colour = new Colour(data[0], data[1], data[2], data[3]);

                    if (colour.alpha !== 0)
                        this.drawImageDataOnCanvas(row, col, pageIndex, renderer, divaCanvas, drawingCanvas, progressCanvas);

                    col++;
                }
                else       // New row
                {
                    row++;
                    col = 0;
                }
            }

            if (this.postProcessImageDataIteration(row, drawingCanvas, chunkNum, chunkSize, canvasToScan).needsRecall)
                setTimeout(doChunk, 1);
        };

        // First call to the doChunck function
        doChunk();
    }

    drawImageDataOnCanvas(row, col, pageIndex, renderer, imageCanvas, drawingCanvas, progressCanvas) {
        let drawingCtx = drawingCanvas.getContext('2d'),
            originalImageCtx = imageCanvas.getContext('2d'),
            progressCtx = progressCanvas.getContext('2d');

        // Fill with diva colours
        let paddedCoords = new Point().getPaddedCoordinatesFromAbsolute(pageIndex, renderer, col, row);

        // FIXME: Sometimes the Diva canvas is not fully rendered!! Have to force a full diva page to render
        // If row and col are not visible then go there
        if (paddedCoords.y < 0)
            renderer.goto(pageIndex, row, col);

        else if (paddedCoords.y > imageCanvas.height)
            renderer.goto(pageIndex, row + imageCanvas.height, col);

        else if (paddedCoords.x < 0)
            renderer.goto(pageIndex, row, col);

        else if (paddedCoords.x > imageCanvas.width)
            renderer.goto(pageIndex, row, col + imageCanvas.width);

        // Get image data from diva page
        let data = originalImageCtx.getImageData(paddedCoords.x, paddedCoords.y, 1, 1).data;
        let colour = new Colour(data[0], data[1], data[2], data[3]);

        drawingCtx.fillStyle = colour.toHTMLColour();
        drawingCtx.fillRect(col, row, 1, 1);

        // Export animation
        progressCtx.fillStyle = colour.toHTMLColour();
        progressCtx.fillRect(col, row, 1, 1);
    }

    postProcessImageDataIteration(row, drawingCanvas, chunkNum, chunkSize, canvasToScan) {
        // Finished exporting a layer
        if (row === canvasToScan.height || this.exportInterrupted)
            this.exportLayersCount -= 1;

        // still didn't finish processing. Update progress and call function again
        if (row < canvasToScan.height && !this.exportInterrupted) {
            let percentage = (chunkNum * chunkSize) * 100 / (canvasToScan.height * canvasToScan.width),
                roundedPercentage = (percentage > 100) ? 100 : Math.round(percentage * 10) / 10;
            this.pixelInstance.uiManager.updateProgress(roundedPercentage);

            // Recall doChunk function
            return {
                needsRecall: true
            };
        }

        // Finished exporting a layer
        else {
            // Last layer to be processed is cancelled
            if (this.exportInterrupted && (this.exportLayersCount === 0))
            {
                this.exportInterrupted = false;
                this.uiManager.destroyExportElements();
            }
            else if (this.exportInterrupted)
            {
                // Do nothing and wait until last layer has finished processing to cancel
            }
            else
            {
                // TODO: Create download buttons that the user can click whenever they want
                drawingCanvas.toBlob((blob) =>
                {
                    let text = document.createTextNode("Download " + drawingCanvas.getAttribute("value") + " image data ");
                    let link = document.getElementById(drawingCanvas.getAttribute("value") + "-image-data-download");
                    if (link === null)
                    {
                        let newImg = document.createElement('img'),
                            url = URL.createObjectURL(blob);

                        newImg.src = url;

                        link = document.createElement("a");
                        link.appendChild(text);
                        document.body.appendChild(link);
                    }

                    // Browsers that support HTML5 download attribute
                    let url = URL.createObjectURL(blob);
                    link.setAttribute("class", "export-download");
                    link.setAttribute("id", drawingCanvas.getAttribute("value") + "-image-data-download");
                    link.setAttribute("href", url);
                    link.setAttribute("download", drawingCanvas.getAttribute("value") + " image data");
                });

                // Finished exporting all layers
                if (this.exportLayersCount === 0)
                {
                    this.uiManager.destroyExportElements();
                }
            }
        }

        return {
            needsRecall: false
        };
    }

    fillMatrix(layer, matrix, canvasToScan, progressCanvas) {
        let chunkSize = canvasToScan.width,
            chunkNum = 0,
            row = 0,
            col = 0,
            progressCtx = progressCanvas.getContext('2d');

        // Necessary for doing computation without blocking the UI
        let doChunk = () => {
            let cnt = chunkSize;
            chunkNum++;

            while (cnt--) {
                if (row >= canvasToScan.height)
                    break;

                if (col < canvasToScan.width) {
                    let data = canvasToScan.getContext('2d').getImageData(col, row, 1, 1).data;
                    let colour = new Colour(data[0], data[1], data[2], data[3]);

                    if (colour.alpha !== 0) {
                        matrix[row][col] = layer.layerId;

                        progressCtx.fillStyle = layer.colour.toHTMLColour();
                        progressCtx.fillRect(col, row, 1, 1);
                    }
                    col++;
                }
                else    // New row
                {
                    row++;
                    col = 0;
                }
            }

            // Finished exporting a layer
            if (row === canvasToScan.height || this.exportInterrupted)
                this.exportLayersCount -= 1;

            // still didn't finish processing. Update progress and call function again
            if (row < canvasToScan.height && !this.exportInterrupted) {
                let percentage = (chunkNum * chunkSize) * 100 / (canvasToScan.height * canvasToScan.width),
                    roundedPercentage = (percentage > 100) ? 100 : Math.round(percentage * 10) / 10;
                this.pixelInstance.uiManager.updateProgress(roundedPercentage);

                // Recall doChunk function
                setTimeout(doChunk, 1);
            }

            // End of Exporting
            if (this.exportLayersCount === 0) {
                this.uiManager.destroyExportElements();
                if (this.exportInterrupted) {
                    this.exportInterrupted = false;
                }
                else {
                    // this.pixelInstance.printMatrix();
                    this.transformMatrixToCSV();
                }
            }
        };

        // First call to the doChunck function
        doChunk();
    }

    initializeMatrix() {
        let core = this.pixelInstance.core;

        let height = core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).height,
            width = core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, this.zoomLevel).width;

        this.matrix = new Array(height).fill(null).map(() => new Array(width).fill(-1));
    }

    transformMatrixToCSV() {
        let csvContent = "",
            filename = "pixel-export";

        for (var row = 0; row < this.matrix.length; row++) {
            let data = this.matrix[row].join(",");
            csvContent += data;
            csvContent += "\n";
        }

        let blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        }
        else
        {
            let text = document.createTextNode("Download CSV ");
            let link = document.getElementById("csv-download");
            if (link === null)
            {
                link = document.createElement("a");
                link.appendChild(text);
                document.body.appendChild(link);
            }
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob);
            link.setAttribute("class", "export-download");
            link.setAttribute("id", "csv-download");
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
        }
    }

    printMatrixOnCanvas(canvas) {
        // Need to implement a buffering page
        // let renderer = this.core.getSettings().renderer;
        let rowlen = this.matrix[0].length,
            ctx = canvas.getContext('2d');

        let handleHit = (row, col) => {
            this.layers.forEach((layer) => {
                if (layer.layerId === this.matrix[row][col]) {
                    ctx.fillStyle = layer.colour.toHTMLColour();
                    ctx.fillRect(col, row, 1, 1);
                }
            });
        };

        for (var row = 0; row < this.matrix.length; row++) {
            for (var col = 0; col < rowlen; col++) {
                if (this.matrix[row][col] !== -1) {
                    handleHit(row, col);
                }
            }
        }
    }
}