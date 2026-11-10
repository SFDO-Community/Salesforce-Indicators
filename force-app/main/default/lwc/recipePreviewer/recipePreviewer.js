import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { recipeToKeyBundle, RECIPE_SCHEMA_VERSION } from 'c/recipeGenerator';

export default class RecipePreviewer extends LightningElement {
    recipeText = '';
    previewBundle;
    errorMessage;
    fileName;

    get hasPreview() {
        return !!this.previewBundle;
    }

    get cannotLoadPreview() {
        return !this.recipeText?.trim();
    }

    handleRecipeTextChange(event) {
        this.recipeText = event.detail.value;
    }

    handleFileUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        this.fileName = file.name;

        const reader = new FileReader();
        reader.onload = () => {
            this.recipeText = reader.result;
            this.loadPreview();
        };
        reader.onerror = () => {
            this.errorMessage = `Couldn't read ${file.name}.`;
        };
        reader.readAsText(file);
    }

    handleLoadPreviewClick() {
        this.loadPreview();
    }

    handleClear() {
        this.recipeText = '';
        this.previewBundle = undefined;
        this.errorMessage = undefined;
        this.fileName = undefined;
    }

    loadPreview() {
        this.errorMessage = undefined;
        this.previewBundle = undefined;

        let recipe;
        try {
            recipe = JSON.parse(this.recipeText);
        } catch (e) {
            this.errorMessage = 'This doesn\'t look like valid JSON. Check the file/paste and try again.';
            return;
        }

        if (!recipe.recipeType || (recipe.recipeType === 'bundle' ? !recipe.bundle : false)) {
            this.errorMessage = 'This JSON doesn\'t look like a recipe — missing recipeType/bundle.';
            return;
        }

        if (recipe.recipeSchemaVersion !== RECIPE_SCHEMA_VERSION) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Different recipe schema version',
                    message: `This recipe was built for schema version ${recipe.recipeSchemaVersion ?? 'unknown'}, ` +
                        `this previewer expects ${RECIPE_SCHEMA_VERSION}. Rendering it anyway, but double-check the result.`,
                    variant: 'warning'
                })
            );
        }

        this.previewBundle = recipeToKeyBundle(recipe);
    }
}
