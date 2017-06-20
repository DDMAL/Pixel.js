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
                eraser: "eraser"
            };
        this.currentTool = this.type.brush;
    }

    getAllTools ()
    {
        let allTools = [];

        for(let type in this.type)
        {
            allTools.push(type);
        }

        return allTools;
    }

    setCurrentTool (tool)
    {
        this.currentTool = tool;
        this.pixelInstance.uiGenerator.markToolSelected(tool);

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