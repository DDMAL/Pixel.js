/* jshint esversion: 6 */

export class Glossary
{
    constructor (pixelInstance)
    {
        this.pixelInstance = pixelInstance;
        this.currentTutorialPageIndex = 0;
        this.modalContent = document.createElement('div');
        this.createGlossary();
    }

    createGlossary ()
    {
        let overlay = document.createElement('div');
        overlay.setAttribute("id", "glossary-div");

        let background = document.createElement('div');
        background.setAttribute("id", "glossary-overlay");

        let modal = document.createElement('div');
        modal.setAttribute("id", "myModal");
        modal.setAttribute("class", "modal");

        this.modalContent.setAttribute("class", "modal-content");

        let modalHeader = document.createElement('div');
        modalHeader.setAttribute("class", "modal-header");

        let text = document.createTextNode("Keyboard Shortcuts");
        let h2 = document.createElement('h2');
        h2.appendChild(text);

        let closeModal = document.createElement('span');
        closeModal.setAttribute("class", "close");
        closeModal.innerHTML = "&times;";

        let modalBody = this.getModalBody(this.currentTutorialPageIndex);

        let modalFooter = document.createElement('div');
        modalFooter.setAttribute("class", "modal-footer");
        modalFooter.setAttribute("id", "modal-footer");

        let close = document.createElement('h2');
        close.innerHTML = "Got It!";

        modal.appendChild(this.modalContent);
        this.modalContent.appendChild(modalHeader);
        this.modalContent.appendChild(modalBody);
        this.modalContent.appendChild(modalFooter);
        modalHeader.appendChild(h2);
        modalHeader.appendChild(closeModal);
        modalFooter.appendChild(close);

        overlay.appendChild(background);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.style.display = "block";

        modalFooter.addEventListener("click", () =>
        {
            overlay.parentNode.removeChild(overlay);
        });
    }

    getModalBody ()
    {
        let modalBody = document.createElement('div');
        modalBody.setAttribute("class", "modal-body");
        modalBody.setAttribute("id", "modal-body");

        let glossaryP = document.createElement('p');
        glossaryP.innerHTML = "The following is a glossary of available hotkeys. To learn how to use them in more detail, please consult the Pixel.js "  + '<a href="https://github.com/DDMAL/Pixel.js/wiki">wiki</a>' + " for details on the different export buttons and more information.";
        
        let hotkeyGlossary = document.createElement('ul');
        hotkeyGlossary.setAttribute("style", "list-style-type:none;");

        let layerSelect = document.createElement('li');
        layerSelect.innerHTML = "<kbd>1</kbd> ... <kbd>9</kbd> layer select";

        let brushTool = document.createElement('li');
        brushTool.innerHTML = "<kbd>B</kbd> brush tool";

        let eraserTool = document.createElement('li');
        eraserTool.innerHTML = "<kbd>E</kbd> eraser tool";

        let fullscreenMode = document.createElement('li');
        fullscreenMode.innerHTML = "<kbd>F</kbd> full screen mode";

        let grabTool = document.createElement('li');
        grabTool.innerHTML = "<kbd>G</kbd> grab tool";

        let hideLayer = document.createElement('li');
        hideLayer.innerHTML = "<kbd>H</kbd> hide selected layer (hold down)";

        let glossaryPopup = document.createElement('li');
        glossaryPopup.innerHTML = "<kbd>K</kbd> keyboard shortcut list";

        let muteLayer = document.createElement('li');
        muteLayer.innerHTML = "<kbd>M</kbd> mute selected layer";

        let rectangleTool = document.createElement('li');
        rectangleTool.innerHTML = "<kbd>R</kbd> rectangle tool";

        let tutorialPopup = document.createElement('li');
        tutorialPopup.innerHTML = "<kbd>T</kbd> tutorial";

        let createLayer = document.createElement('li');
        createLayer.innerHTML = "<kbd>ctrl</kbd> + <kbd>N</kbd> create new layer";

        let deleteLayer = document.createElement('li');
        deleteLayer.innerHTML = "<kbd>cmd</kbd>/<kbd>ctrl</kbd> + <kbd>backspace</kbd> delete selected layer";

        let undo = document.createElement('li');
        undo.innerHTML = "<kbd>cmd</kbd>/<kbd>ctrl</kbd> + <kbd>Z</kbd> undo";

        let redo = document.createElement('li');
        redo.innerHTML = "<kbd>cmd</kbd>/<kbd>ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> redo";

        let moveLayerDown = document.createElement('li');
        moveLayerDown.innerHTML = "<kbd>[</kbd> move selected layer down";

        let moveLayerUp = document.createElement('li');
        moveLayerUp.innerHTML = "<kbd>]</kbd> move selected layer up";

        let shift = document.createElement('li');
        shift.innerHTML = "<kbd>Shift</kbd> force tools to paint in an exact way";

        hotkeyGlossary.appendChild(layerSelect);
        hotkeyGlossary.appendChild(brushTool);
        hotkeyGlossary.appendChild(eraserTool);
        hotkeyGlossary.appendChild(fullscreenMode);
        hotkeyGlossary.appendChild(grabTool);
        hotkeyGlossary.appendChild(hideLayer);
        hotkeyGlossary.appendChild(glossaryPopup);
        hotkeyGlossary.appendChild(muteLayer);
        hotkeyGlossary.appendChild(rectangleTool);
        hotkeyGlossary.appendChild(tutorialPopup);
        hotkeyGlossary.appendChild(createLayer);
        hotkeyGlossary.appendChild(deleteLayer);
        hotkeyGlossary.appendChild(undo);
        hotkeyGlossary.appendChild(redo);
        hotkeyGlossary.appendChild(moveLayerDown);
        hotkeyGlossary.appendChild(moveLayerUp);
        hotkeyGlossary.appendChild(shift);

        modalBody.appendChild(glossaryP);
        modalBody.appendChild(hotkeyGlossary);
        //modalBody.appendChild(layerSelect);

        return modalBody;
    }

    getTutorialPage (pageIndex)
    {
        let modalBody = document.getElementById("modal-body");
        modalBody.parentElement.removeChild(modalBody);

        this.modalContent.insertBefore(this.getModalBody(pageIndex), document.getElementById("modal-footer"));
    }
}