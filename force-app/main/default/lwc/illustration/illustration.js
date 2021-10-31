import { LightningElement, api } from "lwc";
// only imported so it can be referenced in documentation
import { images } from "c/illustrationImage";

export default class Illustration extends LightningElement {
  /**
   * Text displayed below the image to describe why it is being displayed.
   * Should always be specified unless `textOnly` is `true`.
   *
   * @type {string}
   */
  @api heading;

  /**
   * Text displayed below `heading` to provide further description about the why
   * the illustration is being displayed. Can also be populated using a slot by
   * the same name to include links or other rich text. If this property and the
   * slot are populated, the slot content takes precedence.
   *
   * @type {string}
   */
  @api messageBody;

  /**
   * The identifier for the illustration image to show, in the format
   * `[category]:[description]`. See
   * https://www.lightningdesignsystem.com/components/illustration/ for what
   * each option renders.
   *
   * @type {keyof images}
   */
  @api imageName;

  /**
   * The size of the image.
   *
   * @default small
   * @type {"small"|"large"}
   */
  @api imageSize = "small";

  /**
   * Whether or not the image should be hidden from the layout.
   *
   * @default false
   * @type {boolean}
   */
  @api textOnly = false;

  get rootClass() {
    return `slds-illustration slds-illustration_${this.imageSize}`;
  }
}
