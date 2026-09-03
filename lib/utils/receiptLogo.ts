/**
 * The CediBites mark, flattened for a thermal printer.
 *
 * A receipt printer has one colour and no greys: every dot is either burned or
 * it is not. Feeding it the brand webp produces a dithered smudge, because the
 * logo is a mid-tone gold and the driver has to approximate it in scattered
 * dots. So this is the mark reduced to a hard silhouette, taken from the
 * source's alpha channel rather than its luminance — the shape is what the
 * alpha describes, and thresholding the gold would have thrown most of it away.
 *
 * Inlined as a data URI rather than fetched from /cblogo.webp. The receipt is
 * written into a blank popup and printed about 300ms later; an image still in
 * flight at that moment prints as a gap, and a receipt that sometimes has no
 * logo is worse than one that never did.
 *
 * 220x154, two colours, under a kilobyte. Regenerate with sharp:
 *   .extractChannel('alpha').trim().resize({width:220}).threshold(110).negate()
 */
export const RECEIPT_LOGO_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAACaAQMAAAD4lbSzAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAAPoAAAD6AG1e1JrAAADTklEQVR42rXXMW7dMAwAUBoG6qWAMmbzFXID5yg9QscMAWygl+iWq2jrMaruHQQUKDQIUmXLkkiKNtIC9RDk58UWSUm0PsR0rVG8LKQf4Q79Hbr/g3a5u/MW5/pR9Xj+yQPA0OGUP+iEMPMijPuvBvLFETDOrLawIkyjfiG4IEz/OSCMx6N8QZWfVHAjOOYnFdQKI7yCwjgRfIQJoaFY6pTRjkfM6ELoOlwYRoxzQz9ENqi6w7FhSPiWBn2mEVX0U0LdcMVo082jpuFSNCKO0e0z9YvmUtEf0yjhEc0Sv95hmlhhzH3hMlx7rLl8bGhnvlQmNJ/LiUGorYkch4Y/OkSF/1awRdQC+l4WdsOWZ+xRUVzwVqMYGI4YfVmNErq8szxOtKKB8+ko0Yrn9gh4WnI3qdVEy37JGNo8oHDnjLZtAJrojhq3H474xpbodGAo2/HMt1Uhoa+R8iokdKQZBooWYBXwSGOPD3dg1OUOHK5R43gQLgJaglspK0t0FrBuJpVRXSMw1LW4/4rjgZ9kHCSM70H4eyyJrnsRDEON0TIM78HFwtstao4l3NmCMh2e4aodXyaGvytOtsPQ0L2MURw04eheL3CyMPjXIYoRjQnTEBx/5jmzsMUAqxjRjmuE7lTzeKgFvcSNV+Fc2Qnn/D4X8DOkl7npIspzmnBI/zeL+JQevHoYxUwfEqoI/XPDgWns9RzUoI5kDgz7Bge8a8834LE6z5Zg2BEiY84SyLWe7SofJjeK6oyYrGNyq36AyM8s9VaTsXTD55SY0vDh7P9P7cin0qKY4ra6vYfsAfvPUIdc7Dk5qY3kFCxIh8wd3ISRFT83jFqdmRZ+IAi0Pxa06BVfJ5Rh65ChtBrcRlfUdEtAnlY8h3+JtTGSwg/bUuaoYCRnUNyMI5trh3t87BcCRS3gUtAIuBa0AtajgOttuMOxYr/8znf2Bap2/JDSrLgJaVbUQiYVjZBJRStkUtEJmVT0QrAVgxAsOmYJu7fi1gfbUPfBNrRCx0CHQrj4MtPnskZ6SoWLL1BduCND3cWD0HbxIHTd1zKEoRsSIY5Idaj5kBgdy5KgJ6uAYRt0EdAA+6aN0dFYKUbWqSha2uMoBhIOw+NWFS+QHUrtH5DiyD5y9jjIAAAAAElFTkSuQmCC';
