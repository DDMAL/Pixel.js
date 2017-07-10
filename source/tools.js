export class Tools
{
    constructor (pixelInstance)
    {
        this.pixelInstance = pixelInstance;
        this.type =
            {
                brush: "brush",
                rectangle: "rectangle",
                grab: "grab",
                eraser: "eraser",
                select: "select"

            };
        this.currentTool = this.type.brush;
    }

    getAllTools ()
    {
        let allTools = [];

        for (let type in this.type)
        {
            allTools.push(type);
        }
        return allTools;
    }

    setCurrentTool (tool)
    {
        // Remove actions that were specific to the previous tool
        switch (this.currentTool)
        {
            case this.type.grab:
                this.pixelInstance.disableDragScrollable();
                break;
            case this.type.brush:
                this.pixelInstance.uiManager.destroyBrushCursor();
                break;
            case this.type.eraser:
                this.pixelInstance.uiManager.destroyBrushCursor();
                break;
            default:
                break;
        }

        this.currentTool = tool;
        this.pixelInstance.uiManager.markToolSelected(tool);
        let mouseClickDiv = document.getElementById("diva-1-outer");

        // Add actions that are specific to the current tool
        switch (tool)
        {
            case this.type.grab:
                this.pixelInstance.enableDragScrollable();
                mouseClickDiv.style.cursor = "-webkit-grab";
                break;
            case this.type.rectangle:
                mouseClickDiv.style.cursor = "crosshair";
                break;
            case this.type.brush:
                this.pixelInstance.uiManager.createBrushCursor();
                mouseClickDiv.style.cursor = "none";
                break;
            case this.type.eraser:
                this.pixelInstance.uiManager.createBrushCursor();
                mouseClickDiv.style.cursor = "none";
                break;
            case this.type.select:
                mouseClickDiv.style.cursor = "crosshair";
                break;
            default:
                mouseClickDiv.style.cursor = "default";
        }
    }

    getCurrentTool ()
    {
        return this.currentTool;
    }
}