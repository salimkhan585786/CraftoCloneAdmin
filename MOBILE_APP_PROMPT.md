# CraftoClone Mobile App - Canvas & Coordinate Alignment Requirements

## What Was Done in the Admin Panel (CraftoCloneAdmin)

### 1. Canvas Size = Uploaded Image/Video Size
- **The canvas dimensions are now dynamic** — they match the uploaded image/video exactly
- When a user uploads a 720×1280 image, `config_json.width = 720`, `config_json.height = 1280`
- When a user uploads a 1080×1920 image, `config_json.width = 1080`, `config_json.height = 1920`
- **Default fallback**: 1080×1920 (used when no media is uploaded yet)

### 2. Coordinate System
All coordinates in the API payload (`config_json`) are in the **actual uploaded media's pixel space**:

```json
{
  "config_json": {
    "width": <uploaded_image_width>,
    "height": <uploaded_image_height>,
    "template": {
      "canvas": { "width": <uploaded_image_width>, "height": <uploaded_image_height> },
      "accentColor": "#0D62DF"
    },
    "photoFrame": {
      "x": <scaled_x>,
      "y": <scaled_y>,
      "width": <scaled_width>,
      "height": <scaled_height>,
      "borderColor": "#FFFFFF",
      "borderWidth": 3,
      "shape": "circle",
      "animation": { "id": "fade_up", "config": {} }
    },
    "textFields": {
      "name": {
        "position": { "x": <5.6% of width>, "y": <57.3% of height> },
        "width": <88.9% of width>,
        "fontSize": 64,
        ...
      },
      "message": {
        "position": { "x": <5.6% of width>, "y": <62.5% of height> },
        "width": <88.9% of width>,
        "fontSize": 36,
        ...
      }
    },
    "backgroundOverlay": {
      "enabled": true,
      "color": "rgba(0, 0, 0, 0.3)",
      "opacity": 0.3
    },
    "animation": [
      { "id": "fade_up", "from": { "translateY": 346, "opacity": 0.2 }, "to": { "translateY": 0, "opacity": 1 }, "loop": false, "duration": 1400, "easing": "ease" },
      { "id": "pop_in", "from": { "scale": 0.55, "opacity": 0.25 }, "to": { "scale": 1, "opacity": 1 }, "loop": false, "duration": 1400, "easing": "ease" }
    ],
    "output": {
      "format": "MP4",
      "quality": "high",
      "width": <uploaded_image_width>,
      "height": <uploaded_image_height>,
      "fps": 30,
      "duration": 10
    },
    "variables": [
      { "key": "name", "label": "Your Name", "type": "text", "default": "Your Name" },
      { "key": "message", "label": "Message", "type": "text", "default": "Happy Diwali!" }
    ]
  }
}
```

### 3. Admin Editor Display
- The admin editor shows a scaled-down preview (270px wide, aspect ratio matches the media)
- `FRAME_SCALE = uploaded_width / 270` — used to convert between display and actual coordinates
- Live Coordinates panel shows the **actual payload values** (already scaled)

### 4. Available Animations
These are the animation IDs that can be used in both `photoFrame.animation` and the `config_json.animation` array:

| ID | Label | Type | From | To | Duration |
|---|---|---|---|---|---|
| `fade_up` | Fade Up | entry | `translateY: 346, opacity: 0.2` | `translateY: 0, opacity: 1` | 1400ms |
| `slide_top_right` | Top Right Entry | entry | `translateX: 756, translateY: -1344` | `translateX: 0, translateY: 0` | 1400ms |
| `pop_in` | Pop In | entry | `scale: 0.55, opacity: 0.25` | `scale: 1, opacity: 1` | 1400ms |
| `rotate_soft_left` | Rotate Left | entry | `rotate: -12deg, scale: 0.95` | `rotate: 0deg, scale: 1` | 1400ms |
| `float_up_down` | Float Up Down | loop | `translateY: -346` | `translateY: 346` | 2200ms, alternateSlow |

### 5. Key payload fields
- `config_json.width` / `config_json.height` — The canvas size (equals uploaded media dimensions)
- `config_json.template.canvas.width/height` — Same as above
- `config_json.photoFrame` — User photo placement (circle, square, or rectangle)
- `config_json.photoFrame.animation` — Entry animation for the photo frame
- `config_json.animation[]` — Animations for text/content elements
- `config_json.output` — Final output format (MP4 for VIDEO, JPEG for IMAGE)
- `config_json.textFields` — Text field positions, fonts, sizes, colors
- `config_json.backgroundOverlay` — Dark overlay on background
- `config_json.variables` — Template variables (name, message)
- `config_json.template.accentColor` — Theme accent color

---

## What Needs to Be Done in the Mobile App (CraftoClone)

### Requirement 1: Canvas Size Must Match Template Exactly
The React Native app must render the template canvas at the dimensions provided in the payload:
- `config_json.width` — Canvas width (matches uploaded image width)
- `config_json.height` — Canvas height (matches uploaded image height)
- `config_json.template.canvas.width` and `config_json.template.canvas.height`

**Action**: Use these values directly as the canvas/render dimensions. Do NOT use hardcoded values. The canvas aspect ratio varies per template.

### Requirement 2: Photo Frame Rendering
The `config_json.photoFrame` object defines where the user's photo goes:
- `x`, `y` — Position on the canvas (in uploaded image pixel space)
- `width`, `height` — Size of the photo area
- `shape` — `"circle"`, `"square"`, or `"rectangle"`
- `borderColor`, `borderWidth` — Border styling
- `animation` — Entry animation config (see animation table above)

**Action**: Place the user's photo at `(x, y)` with `(width, height)` dimensions, clip to the specified shape, and apply the entry animation.

### Requirement 3: Text Field Rendering
Text fields are defined in `config_json.textFields`:
- `position.x`, `position.y` — Position on the canvas
- `width` — Max text width
- `fontSize`, `fontFamily`, `fontWeight` — Typography
- `color` — Text color
- `align` — Text alignment (`"center"`, etc.)
- `content` — Template string with `{{variable}}` placeholders
- `visible` — Whether to show

**Action**: Render each visible text field at its position with the specified styling. Replace `{{variable}}` placeholders with user-provided values.

### Requirement 4: Content Animations
The `config_json.animation` array defines animations for text/content elements:
- Each entry has `id`, `from`, `to`, `loop`, `duration`, `easing`
- Apply these animations to text fields and other content elements on screen entry

**Action**: Implement the animation system supporting:
- `translateX`, `translateY` — Position transitions
- `scale` — Scale transitions
- `opacity` — Fade transitions
- `rotate` — Rotation transitions
- `loop: false` — Play once
- `loop: "alternateSlow"` — Loop back and forth
- `easing: "ease"` — Standard easing
- `easing: { type: "spring", speed: 1.8, bounciness: 14 }` — Spring animation

### Requirement 5: Background Overlay
`config_json.backgroundOverlay` adds a semi-transparent overlay:
- `enabled` — Whether to show
- `color` — Overlay color (e.g., `"rgba(0, 0, 0, 0.3)"`)
- `opacity` — Overlay opacity

**Action**: When enabled, render a colored overlay on top of the background image/video.

### Requirement 6: Screen Consistency
The **Edit Screen** and **Preview Screen** must render the template identically:
- Same canvas size (from `config_json.width`/`height`)
- Same frame position and size
- Same text positions and styling
- Same animations

**Action**: Both screens should use the same rendering component/logic. Extract the template renderer into a shared component.

### Requirement 7: Output Format
`config_json.output` specifies the final output:
- `format` — `"MP4"` for video, `"JPEG"` for image
- `quality` — `"high"`
- `width`, `height` — Output dimensions (matches uploaded media)
- `fps` — Frames per second (30, for VIDEO)
- `duration` — Duration in seconds (10, for VIDEO)

**Action**: For VIDEO templates, render a preview at the specified fps/duration. For IMAGE templates, render a static image.

### Requirement 8: Preview URL
The API response includes a `preview_url` field:
- On creation, it starts as `null`
- It is generated asynchronously by the backend
- The mobile app should poll or refresh to get the preview URL

**Action**: After creating/updating a template, poll the template details endpoint until `preview_url` is non-null, or use a fallback rendering approach.

---

## Summary of Coordinate Space
| Context | Dimensions | Coordinate Space |
|---|---|---|
| API Payload (`config_json`) | Uploaded image size (e.g., 1080×1920) | All coordinates (photoFrame, textFields, etc.) |
| Mobile App Canvas | `config_json.width × config_json.height` | Use payload coordinates directly |
| Admin Editor Display | 270px wide, aspect ratio matches media | Scaled by FRAME_SCALE for preview only |

**The mobile app should use coordinates from the payload as-is, since they are already in the actual media's pixel space.**
