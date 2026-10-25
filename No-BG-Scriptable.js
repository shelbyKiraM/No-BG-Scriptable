// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: magic;
/*
MIT License

CC-BY-SA 2026 Shelby Kira Marvell
https://github.com/shelbyKiraM/No-BG-Scriptable

Copyright (c) 2024 Maxwell Zeryck
https://gist.github.com/mzeryck/3a97ccd1e059b3afa3c6666d27a496c9

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const files = FileManager.local()
const path = files.joinPath(files.documentsDirectory(), Script.name() + ".jpg")
console.log(path)
// If set as a widget, attempt to use the matching generated background.
if (config.runsInWidget) {
	const widget = new ListWidget()
	if (files.fileExists(path)) widget.backgroundImage = files.readImage(path)
	Script.setWidget(widget)
	Script.complete()

// If run in the app, generate an in "invisible" background.
} else {
	
	// Determine if user has taken the screenshot.
	let message = "Before you start, edit your home screen (wiggle mode). Scroll to the empty page on the far right and take a screenshot."
	const shouldExit = await generateAlert(message,["Continue","Exit to Take Screenshot"])
	if (shouldExit.index) return
	
	// Get screenshot and determine phone size.
	let img = await Photos.fromLibrary()
	const height = img.size.height
	let phone = phoneSizes(height)
	if (!phone) {
		message = "It looks like you selected an image that isn't an iPhone screenshot, or your iPhone is not supported. Try again with a different image."
		return await generateAlert(message,["OK"])
	}
	
	// Extra setup needed for 2436-sized phones.
	if (height == 2436) {
	
		const cachePath = files.joinPath(files.libraryDirectory(), "mz-phone-type")
	
		// If we already cached the phone size, load it.
		if (files.fileExists(cachePath)) {
			const type = files.readString(cachePath)
			phone = phone[type]
		
		// Otherwise, prompt the user.
		} else { 
			message = "What type of iPhone do you have?"
			const typeOptions = [{key: "mini", value: "iPhone 13 mini or 12 mini"}, {key: "x", value: "iPhone 11 Pro, XS, or X"}]
			const typeResponse = await generateAlert(message, typeOptions)
			phone = phone[typeResponse.key]
			files.writeString(cachePath, typeResponse.key)
		}
	}
	
	// If supported, check whether home screen has text labels or not.
	if (phone.text) {
		message = "What size are your home screen icons?"
		const textOptions = [{key: "text", value: "Small (has labels)"},{key: "notext", value: "Large (no labels)"}]
		const textResponse = await generateAlert(message, textOptions)
		phone = phone[textResponse.key]
	}

	// Prompt for widget size.
	message = "What size of widget are you creating?"
	const sizes = {small: "Small", medium: "Medium", large: "Large", all: "All"
	const sizeOptions = [sizes.small, sizes.medium, sizes.large, sizes.all]
	const size = (await generateAlert(message,sizeOptions)).value
	if (size == 'all') {
		sizes.forEach((ksiz,vsiz)=>{
			if (vsiz != "All") {
				// loop through, generating all sizes and positions
				// and save in Scriptable documents dir/cache/ghost
				
			}
		})
	} else {
		// Prompt for position.
		message = "What position will it be in?"
		message += (height == 1136 ? " (Note that your device only supports two rows of widgets, so the middle and bottom options are the same.)" : "")
		
		let positions
		if (size == sizes.small) {
			positions = ["Top left","Top right","Middle left","Middle right","Bottom left","Bottom right"]
		} else if (size == sizes.medium) {
			positions = ["Top","Middle","Bottom"]
		} else if (size == sizes.large) {
			positions = [{key: "top", value: "Top"},{key: "middle", value: "Bottom"}]
		} else if (size == sizes.all) {
			positions = [{key: "all", value:"All"}]
		}
		const position = (await generateAlert(message,positions)).key
	
		// Determine image crop based on the size and position.
		const crop = { 
			w: (size == sizes.small ? phone.small : phone.medium),
			h: (size == sizes.large ? phone.large : phone.small),
			x: (size == sizes.small ? phone[position.split(" ")[1]] : phone.left),
			y: phone[position.toLowerCase().split(" ")[0]]
		}
		
		// Crop the image.
		const draw = new DrawContext()
		draw.size = new Size(crop.w, crop.h)
		draw.drawImageAtPoint(img,new Point(-crop.x, -crop.y))	
		img = draw.getImage()
		
		// Finalize the widget.
		message = "Your widget background is ready. Would you like to use it as this script's background, or export the image?"
		const exports = {script: "Use for this script", photos: "Export to Photos", files: "Export to Files"}
		const exportOptions = [exports.script, exports.photos, exports.files]
		const exportValue = (await generateAlert(message,exportOptions)).value
		
		if (exportValue == exports.script) {
			files.writeImage(path,img)
		} else if (exportValue == exports.photos) {
			Photos.save(img)
		} else if (exportValue == exports.files) {
			await DocumentPicker.exportImage(img)
		}
	}
	Script.complete()
}

// Generate an alert with the provided array of options.
async function generateAlert(message,options) {
	
	const alert = new Alert()
	alert.message = message
	
	const isObject = options[0].value
	for (const option of options) {
		alert.addAction(isObject ? option.value : option)
	}
	
	const index = await alert.presentAlert()
	return { 
		index: index, 
		value: isObject ? options[index].value : options[index],
		key: isObject ? options[index].key : options[index]
	}
}

/*

How phoneSizes() works
======================
This function takes the pixel height value of an iPhone screenshot and provides information about the sizes and locations of widgets on that iPhone. The "text" and "notext" properties refer to whether the home screen is set to Small (with text labels) or Large (no text labels).

The remaining properties can be determined using a single screenshot of a home screen with 6 small widgets on it. You can see a visual representation of these properties by viewing this image: https://github.com/mzeryck/Widget-Blur/blob/main/measurements.png

* The following properties define widget sizes:
	- small: The height of a small widget.
	- medium: From the left of the leftmost widget to the right of the rightmost widget.
	- large: From the top of a widget in the top row to the bottom of a widget in the middle row.

* The following properties measure the distance from the left edge of the screen: 
	- left: The distance to the left edge of widgets in the left column.
	- right: The distance to the left edge of widgets in the right column.
	
* The following properties measure the distance from the top edge of the screen: 
	- top: The distance to the top edge of widgets in the top row.
	- middle: The distance to the top edge of widgets in the middle row.
	- bottom: The distance to the top edge of widgets in the bottom row.

*/
function phoneSizes(inputHeight) {
	return { 
	
		/*
	
		Supported devices
		=================
		The following device measurements have been confirmed in iOS 18.
	
		*/
	
		// 16 Pro Max
		"2868": {
			text: {
				small: 510,
				medium: 1092,
				large: 1146,
				left: 114,
				right: 696,
				top: 276,
				middle: 912,
				bottom: 1548
			},
			notext: {
				small: 530,
				medium: 1138,
				large: 1136,
				left: 91,
				right: 699,
				top: 276,
				middle: 882,
				bottom: 1488
			} 
		},
		
		// 16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max
		"2796": {
			text: {
				small: 510,
				medium: 1092,
				large: 1146,
				left: 98,
				right: 681,
				top: 252,
				middle: 888,
				bottom: 1524
			},
			notext: {
				small: 530,
				medium: 1139,
				large: 1136,
				left: 75,
				right: 684,
				top: 252,
				middle: 858,
				bottom: 1464
			}
		},
		
		// 16 Pro
		"2622": {
			text: {
				small: 486,
				medium: 1032,
				large: 1098,
				left: 87,
				right: 633,
				top: 261,
				middle: 872,
				bottom: 1485
			},
			notext: {
				small: 495,
				medium: 1037,
				large: 1035,
				left: 84,
				right: 626,
				top: 270,
				middle: 810,
				bottom: 1350
			} 
		},

		// 16, 15, 15 Pro, 14 Pro
		"2556": {
			text: {
				small: 474,
				medium: 1017,
				large: 1062,
				left: 81,
				right: 624,
				top: 240,
				middle: 828,
				bottom: 1416
			},
			notext: {
				small: 495,
				medium: 1047,
				large: 1047,
				left: 66,
				right: 618,
				top: 243,
				middle: 795,
				bottom: 1347
			}
		},
	
		// SE3, SE2
		"1334": {
			text: {
				small: 296,
				medium: 642,
				large: 648,
				left: 54,
				right: 400,
				top: 60,
				middle: 412,
				bottom: 764
			},
			notext: {
				small: 309,
				medium: 667,
				large: 667,
				left: 41,
				right: 399,
				top: 67,
				middle: 425,
				bottom: 783
			}
		},
		
		/*
	
		In-limbo devices
		=================
		The following device measurements were confirmed in older versions of iOS.
		Please comment if you can confirm these for iOS 18.
	
		*/
		 
		// 14 Plus, 13 Pro Max, 12 Pro Max
		"2778": {
			small: 510,
			medium: 1092,
			large: 1146,
			left: 96,
			right: 678,
			top: 246,
			middle: 882,
			bottom: 1518
		},

		// 11 Pro Max, XS Max
		"2688": {
			small: 507,
			medium: 1080,
			large: 1137,
			left: 81,
			right: 654,
			top: 228,
			middle: 858,
			bottom: 1488
		},
		
		// 14, 13, 13 Pro, 12, 12 Pro
		"2532": {
			small: 474,
			medium: 1014,
			large: 1062,
			left: 78,
			right: 618,
			top: 231,
			middle: 819,
			bottom: 1407
		},

		// 13 mini, 12 mini / 11 Pro, XS, X
		"2436": {
			x: {
				small: 465,
				medium: 987,
				large: 1035,
				left: 69,
				right: 591,
				top: 213,
				middle: 783,
				bottom: 1353
			},
			mini: {
				small: 465,
				medium: 987,
				large: 1035,
				left: 69,
				right: 591,
				top: 231,
				middle: 801,
				bottom: 1371
			} 
		},
		
		// 11, XR
		"1792": {
			small: 338,
			medium: 720,
			large: 758,
			left: 55,
			right: 437,
			top: 159,
			middle: 579,
			bottom: 999
		},
		
		// 11 and XR in Display Zoom mode
		"1624": {
			small: 310,
			medium: 658,
			large: 690,
			left: 46,
			right: 394,
			top: 142,
			middle: 522,
			bottom: 902 
		},
		
		/*
	
		Older devices
		=================
		The following devices cannot be updated to iOS 18 or later.
	
		*/
	
		// Home button Plus phones
		"2208": {
			small: 471,
			medium: 1044,
			large: 1071,
			left: 99,
			right: 672,
			top: 114,
			middle: 696,
			bottom: 1278
		},
		
		// Home button Plus in Display Zoom mode
		"2001" : {
			small: 444,
			medium: 963,
			large: 972,
			left: 81,
			right: 600,
			top: 90,
			middle: 618,
			bottom: 1146
		},

		// SE1
		"1136": {
			small: 282,
			medium: 584,
			large: 622,
			left: 30,
			right: 332,
			top: 59,
			middle: 399,
			bottom: 399
		}
	}[inputHeight]
}