export class UIGenerator
{
    constructor (pixelInstance)
    {
        this.pixelInstance = pixelInstance;
    }

    /**
     * ===============================================
     *            Creating HTML UI Elements
     * ===============================================
     **/

    createPluginElements (layers)
    {
        this.placeLayerCanvasesInDiva(layers);
        this.createUndoButton();
        this.createRedoButton();
        this.createLayersView(layers);
        this.createBrushSizeSelector();
        this.createToolsView(["brush", "rectangle", "grab", "eraser"]);
        this.createExportButtons();
    }

    destroyPluginElements (layers, background)
    {
        this.destroyLayerSelectors(layers);
        this.destroyBrushSizeSelector();
        this.destroyUndoButton();
        this.destroyRedoButton();
        this.destroyExportButtons();
        this.destroyPixelCanvases(layers);
        this.destroyToolsView(["brush", "rectangle", "grab", "eraser"]);
        this.destroyLockedLayerSelectors(background);
    }

    // Tools are strings or enums
    createToolsView (tools)
    {
        let form = document.createElement("form");
        form.setAttribute("id", "tool-selector");

        let handleClick = (radio) =>
        {
            radio.addEventListener("click", () =>
            {
                this.pixelInstance.currentTool = radio.value;

                if (radio.value === "grab")
                    this.pixelInstance.enableDragScrollable();

                else
                    this.pixelInstance.disableDragScrollable();
            });
        };

        // Create an element for each tool and
        for (let index = 0; index < tools.length; index++)
        {
            let tool = tools[index],
                radio = document.createElement("input"),
                content = document.createTextNode(tool),
                br = document.createElement("br");

            radio.setAttribute("id", tool);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", tool);
            radio.setAttribute("name", "tool-selector");
            handleClick(radio);

            // TODO: this.selectedTool (fixes tool selection after deactivating and activating plugin)
            // Currently on reactivation, selected radio button does not correspond to tool
            if (tool === "brush")      // Layer at position 0 is checked by default
                radio.checked = true;

            form.appendChild(radio);
            form.appendChild(content);
            form.appendChild(br);
        }
        document.body.appendChild(form);
    }

    destroyToolsView ()
    {
        let form = document.getElementById("tool-selector");
        form.parentNode.removeChild(form);
    }

    placeLayerCanvasesInDiva (layers)
    {
        let divaCanvas = this.pixelInstance.core.getSettings().renderer._canvas;
        for (let index = layers.length - 1; index >= 0; index--)
        {
            let layer = layers[index];
            layer.placeCanvasAfterElement(divaCanvas);

            if (layer.isActivated())
                layer.getCanvas().setAttribute("style", layer.getLayerOpacityCSSString());
            else
                layer.getCanvas().setAttribute("style", "opacity: 0;");
        }

        if (this.pixelInstance.background.isActivated())
            this.pixelInstance.background.getCanvas().setAttribute("style", this.pixelInstance.background.getLayerOpacityCSSString());
        else
            this.pixelInstance.background.getCanvas().setAttribute("style", "opacity: 0;");
    }

    destroyPixelCanvases (layers)
    {
        layers.forEach((layer) =>
        {
            layer.getCanvas().parentNode.removeChild(layer.getCanvas());
        });
    }

    createOpacitySlider (layer, parentElement, referenceNode)
    {
        let opacityDiv = document.createElement("div"),
            opacityText = document.createElement("p"),
            opacitySlider = document.createElement("input"),
            text = document.createTextNode("Opacity");

        opacityDiv.setAttribute("class", "layer-tool");
        opacityDiv.setAttribute("id", "layer-" + layer.layerId + "-opacity-tool");

        opacityText.setAttribute("class", "layer-tool-text");
        opacityText.setAttribute("id", "layer-" + layer.layerId + "-opacity-text");

        opacitySlider.setAttribute("class", "layer-tool-slider");
        opacitySlider.setAttribute("id", "layer-" + layer.layerId + "-opacity-slider");
        opacitySlider.setAttribute("type", "range");
        opacitySlider.setAttribute('max', 50);
        opacitySlider.setAttribute('min', 0);

        opacitySlider.setAttribute('value', layer.getLayerOpacity() * 50);
        opacitySlider.setAttribute("draggable", "false");

        opacitySlider.addEventListener("input", () =>
        {
            layer.setLayerOpacity(opacitySlider.value / 50);
            if (layer.isActivated())    // Respecify opacity only when the layer is activated
                layer.getCanvas().setAttribute("style", layer.getLayerOpacityCSSString());
        });

        opacityText.appendChild(text);
        opacityDiv.appendChild(opacityText);
        opacityDiv.appendChild(opacitySlider);
        parentElement.insertBefore(opacityDiv, referenceNode.nextSibling);
    }

    destroyOpacitySlider (layer)
    {
        let opacitySlider = document.getElementById("layer-" + layer.layerId + "-opacity-tool");
        opacitySlider.parentElement.removeChild(opacitySlider);
    }

    createBackground ()
    {
        let backgroundViewDiv = document.createElement("div");
        backgroundViewDiv.setAttribute("id", "background-view");
        backgroundViewDiv.setAttribute("class", "background-view");

        // Should only have 1 element, but perhaps there will one day be more than 1 background
        let layer = this.pixelInstance.background,
            layerDiv = document.createElement("div"),
            colourDiv = document.createElement("div"),
            layerName = document.createElement("input"),
            layerOptionsDiv = document.createElement("div"),
            layerActivationDiv = document.createElement("div");

        layerDiv.setAttribute("draggable", "false");
        layerDiv.setAttribute("class", "layer-div");
        layerDiv.setAttribute("value", layer.layerId);
        layerDiv.setAttribute("id", "layer-" + layer.layerId + "-selector");

        layerName.setAttribute("type", "text");
        layerName.setAttribute("readonly", "true");
        layerName.setAttribute("value", layer.layerName);
        layerName.setAttribute("ondblclick", "this.readOnly='';");

        colourDiv.setAttribute("class", "color-box");
        colourDiv.setAttribute("style", "background-color: " + layer.colour.toHexString() + ";");

        layerOptionsDiv.setAttribute("class", "unchecked-layer-settings");
        layerOptionsDiv.setAttribute("id", "layer-" + layer.layerId + "-options");

        if (this.pixelInstance.background.isActivated())
            layerActivationDiv.setAttribute("class", "layer-activated");
        else
            layerActivationDiv.setAttribute("class", "layer-deactivated");

        layerActivationDiv.setAttribute("id", "layer-" + layer.layerId + "-activation");

        if (layer.layerId === this.pixelInstance.selectedLayerIndex)
        {
            layerDiv.classList.add("selected-layer");
        }

        colourDiv.addEventListener("click", () => { this.pixelInstance.displayColourOptions(); });
        layerActivationDiv.addEventListener("click", () => { this.pixelInstance.toggleLayerActivation(layer, layerActivationDiv); });
        layerName.addEventListener('keypress', (e) => { this.pixelInstance.editLayerName(e, layerName); });
        layerOptionsDiv.onclick = () => { this.pixelInstance.displayLayerOptions(layer, layerOptionsDiv); };

        layerDiv.appendChild(layerName);
        layerDiv.appendChild(layerOptionsDiv);
        layerDiv.appendChild(colourDiv);
        layerDiv.appendChild(layerActivationDiv);
        backgroundViewDiv.appendChild(layerDiv);

        this.pixelInstance.background.getCanvas().setAttribute("style", "opacity: 1;");

        document.body.appendChild(backgroundViewDiv);
    }

    destroyLockedLayerSelectors ()
    {
        let backgroundViewDiv = document.getElementById("background-view");
        backgroundViewDiv.parentNode.removeChild(backgroundViewDiv);
    }

    createLayersView (layers)
    {
        let departureIndex, destinationIndex;

        let layersViewDiv = document.createElement("div");
        layersViewDiv.setAttribute("id", "layers-view");
        layersViewDiv.setAttribute("class", "layers-view");

        let handleEvents = (layer, colourDiv, layerActivationDiv, layerName, layerOptionsDiv, layerDiv) =>
        {
            colourDiv.addEventListener("click", () => { this.pixelInstance.displayColourOptions(); });
            layerActivationDiv.addEventListener("click", () => { this.pixelInstance.toggleLayerActivation(layer, layerActivationDiv); });
            layerName.addEventListener('keypress', (e) => { this.pixelInstance.editLayerName(e, layerName); });
            layerOptionsDiv.onclick = () => { this.pixelInstance.displayLayerOptions(layer, layerOptionsDiv); };

            layerDiv.ondrag = (evt) => { this.pixelInstance.dragging(evt); };
            layerDiv.ondragstart = (evt) => { this.pixelInstance.dragStart(evt); };
            layerDiv.ondrop = (evt) => { this.pixelInstance.drop(evt, departureIndex, destinationIndex); };
            layerDiv.onmousedown = () =>
            {
                departureIndex = layerDiv.getAttribute("index");
                this.pixelInstance.highlightSelectedLayer(layerDiv.getAttribute("value"));
            };

            layerDiv.ondragover = (evt) =>
            {
                this.pixelInstance.allowDrop(evt);
                destinationIndex = layerDiv.getAttribute("index");
            };
        };


        // Backwards because layers' display should be the same as visual "z-index" priority (depth)
        for (var index = layers.length - 1; index >= 0; index--)
        {
            let layer = layers[index],
                layerDiv = document.createElement("div"),
                colourDiv = document.createElement("div"),
                layerName = document.createElement("input"),
                layerOptionsDiv = document.createElement("div"),
                layerActivationDiv = document.createElement("div");

            layerDiv.setAttribute("index", index);
            layerDiv.setAttribute("draggable", "true");
            layerDiv.setAttribute("class", "layer-div");
            layerDiv.setAttribute("value", layer.layerId);
            layerDiv.setAttribute("id", "layer-" + layer.layerId + "-selector");

            layerName.setAttribute("type", "text");
            layerName.setAttribute("readonly", "true");
            layerName.setAttribute("value", layer.layerName);
            layerName.setAttribute("ondblclick", "this.readOnly='';");

            colourDiv.setAttribute("class", "color-box");
            colourDiv.setAttribute("style", "background-color: " + layer.colour.toHexString() + ";");

            layerOptionsDiv.setAttribute("class", "unchecked-layer-settings");
            layerOptionsDiv.setAttribute("id", "layer-" + layer.layerId + "-options");

            if (layer.isActivated())
                layerActivationDiv.setAttribute("class", "layer-activated");
            else
                layerActivationDiv.setAttribute("class", "layer-deactivated");


            layerActivationDiv.setAttribute("id", "layer-" + layer.layerId + "-activation");

            if (layer.layerId === this.pixelInstance.selectedLayerIndex)
            {
                layerDiv.classList.add("selected-layer");
            }

            handleEvents(layer, colourDiv, layerActivationDiv, layerName, layerOptionsDiv, layerDiv);

            layerDiv.appendChild(layerName);
            layerDiv.appendChild(layerOptionsDiv);
            layerDiv.appendChild(colourDiv);
            layerDiv.appendChild(layerActivationDiv);
            layersViewDiv.appendChild(layerDiv);
        }
        document.body.appendChild(layersViewDiv);

        this.createBackground(layers);

    }

    destroyLayerSelectors ()
    {
        let layersViewDiv = document.getElementById("layers-view");
        layersViewDiv.parentNode.removeChild(layersViewDiv);
    }

    createBrushSizeSelector ()
    {
        let brushSizeSelector = document.createElement("input");
        brushSizeSelector.setAttribute("id", "brush-size-selector");
        brushSizeSelector.setAttribute("type", "range");
        brushSizeSelector.setAttribute('max', 50);
        brushSizeSelector.setAttribute('min', 1);
        brushSizeSelector.setAttribute('value', 10);

        document.body.appendChild(brushSizeSelector);
    }

    destroyBrushSizeSelector ()
    {
        let brushSizeSelector = document.getElementById("brush-size-selector");
        brushSizeSelector.parentNode.removeChild(brushSizeSelector);
    }

    createUndoButton ()
    {
        let undoButton = document.createElement("button"),
            text = document.createTextNode("Undo");

        this.undo = () => { this.pixelInstance.undoAction(); };

        undoButton.setAttribute("id", "undo-button");
        undoButton.appendChild(text);
        undoButton.addEventListener("click", this.undo);

        document.body.appendChild(undoButton);
    }

    destroyUndoButton ()
    {
        let undoButton = document.getElementById("undo-button");
        undoButton.parentNode.removeChild(undoButton);
    }

    createRedoButton ()
    {
        let redoButton = document.createElement("button"),
            text = document.createTextNode("Redo");

        this.redo = () => { this.pixelInstance.redoAction(); };

        redoButton.setAttribute("id", "redo-button");
        redoButton.appendChild(text);
        redoButton.addEventListener("click", this.redo);

        document.body.appendChild(redoButton);
    }

    destroyRedoButton ()
    {
        let redoButton = document.getElementById("redo-button");
        redoButton.parentNode.removeChild(redoButton);
    }

    createExportButtons ()
    {
        let csvExportButton = document.createElement("button"),
            csvExportText = document.createTextNode("Export as CSV"),
            pngExportButton = document.createElement("button"),
            pngExportText = document.createTextNode("Export as PNG"),
            pngDataExportButton = document.createElement("button"),
            pngDataExportText = document.createTextNode("Export as PNG Data");

        this.exportCSV = () => { this.pixelInstance.exportAsCSV(); };
        this.exportPNG = () => { this.pixelInstance.exportAsHighlights(); };
        this.exportPNGData = () => { this.pixelInstance.exportAsImageData(); };

        csvExportButton.setAttribute("id", "csv-export-button");
        csvExportButton.appendChild(csvExportText);
        csvExportButton.addEventListener("click", this.exportCSV);

        pngExportButton.setAttribute("id", "png-export-button");
        pngExportButton.appendChild(pngExportText);
        pngExportButton.addEventListener("click", this.exportPNG);

        pngDataExportButton.setAttribute("id", "png-export-data-button");
        pngDataExportButton.appendChild(pngDataExportText);
        pngDataExportButton.addEventListener("click", this.exportPNGData);

        document.body.appendChild(csvExportButton);
        document.body.appendChild(pngExportButton);
        document.body.appendChild(pngDataExportButton);
    }

    destroyExportButtons ()
    {
        let csvexportButton = document.getElementById("csv-export-button"),
            pngexportButton = document.getElementById("png-export-button"),
            pngexportDataButton = document.getElementById("png-export-data-button");

        csvexportButton.parentNode.removeChild(csvexportButton);
        pngexportButton.parentNode.removeChild(pngexportButton);
        pngexportDataButton.parentNode.removeChild(pngexportDataButton);
    }

    updateProgress (percentage) {
        let percentageStr = percentage + "%";
        let widthStr = "width: " + percentageStr;
        document.getElementById("pbar-inner-div").setAttribute("style", widthStr);
        document.getElementById("pbar-inner-text").innerHTML = percentageStr;
    }

    destroyBackground (layers)
    {
        this.pixelInstance.destroyLockedLayerSelectors(layers);
    }
}
