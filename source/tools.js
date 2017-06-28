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
        this.currentTool = tool;
        this.pixelInstance.uiManager.markToolSelected(tool);

        if (tool === this.type.grab)
            this.pixelInstance.enableDragScrollable();
        else
            this.pixelInstance.disableDragScrollable();
    }

    getCurrentTool ()
    {
        return this.currentTool;
    }
}