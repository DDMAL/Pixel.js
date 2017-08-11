/*jshint esversion: 6 */
import {Colour} from './colour';
import {Point} from './point';

export class Import {
    constructor(pixelInstance, layers, pageIndex, zoomLevel, uiManager) {
        this.pixelInstance = pixelInstance;
        this.layers = layers;
        this.exportInterrupted = false;
        this.pageIndex = pageIndex;
        this.zoomLevel = zoomLevel;
        this.matrix = null;
        this.uiManager = uiManager;
    }

    /**
     * Creates a PNG for each layer where the pixels spanned by the layers are replaced by the actual image data
     * of the Diva page
     */
    uploadLayerPNGToCanvas(layer, e)
    {
        let imageCanvas = document.createElement("canvas");
        imageCanvas.width = layer.getCanvas().width;
        imageCanvas.height = layer.getCanvas().height;

        let ctx = imageCanvas.getContext("2d"),
            reader = new FileReader();

        reader.onload = (event) =>
        {
            let img = new Image();
            img.onload = () =>
            {
                ctx.drawImage(img,0,0);

                let imageData = ctx.getImageData(0, 0, layer.getCanvas().width, layer.getCanvas().height),
                    data = imageData.data;

                for(let i = 0; i < data.length; i += 4)
                {
                        data[i] = layer.colour.red;             // red
                        data[i + 1] = layer.colour.green;       // green
                        data[i + 2] = layer.colour.blue;        // blue
                }
                // overwrite original image
                ctx.putImageData(imageData, 0, 0);

                layer.setPreBinarizedImageCanvas(imageCanvas);
                layer.drawLayer(this.pixelInstance.core.getSettings().maxZoomLevel, layer.getCanvas());
            };
            img.src = event.target.result;
        };

        reader.readAsDataURL(e.target.files[0]);
    }
}