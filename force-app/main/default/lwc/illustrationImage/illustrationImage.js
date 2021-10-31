import { LightningElement, api } from "lwc";
import { default as images, empty } from "./images/index";

export { images };
export default class IllustrationImage extends LightningElement {
  /**
   * The identifier for the image to show, in the format
   * `[category]:[description]`. See
   * https://www.lightningdesignsystem.com/components/illustration/ for what
   * each option renders.
   *
   * @type {keyof images}
   */
  @api imageName;

  render() {
    const { imageName } = this;

    if (images[imageName]) {
      return images[imageName];
    } else {
      console.warn(
        `Missing template for image name "${imageName}". Valid options are: ${Object.keys(
          images
        )}`
      );
      return empty;
    }
  }
}
