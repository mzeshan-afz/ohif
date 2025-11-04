# OHIF Viewer - Folder Structure & Key Files

## 📁 Folder Structure Overview

```
Viewers-release-3.11/
├── platform/                    # Core platform code
│   ├── app/                     # Main application (routing, entry point)
│   │   └── src/
│   │       ├── routes/          # Route components (WorkList, Mode, etc.)
│   │       └── components/      # Shared components
│   ├── core/                    # Business logic & services
│   ├── ui/                      # Legacy UI component library
│   └── ui-next/                 # Modern UI component library (React + Tailwind)
│
├── extensions/                  # Feature extensions
│   ├── default/                 # Default extension (panels, datasources)
│   │   ├── src/
│   │       ├── Panels/          # Side panels (StudyBrowser, etc.)
│   │       └── ViewerLayout/   # Main viewer layout
│   ├── cornerstone/            # Image rendering extension
│   ├── cornerstone-dicom-rt/   # RTSTRUCT support
│   ├── cornerstone-dicom-seg/  # Segmentation support
│   └── ...                     # Other extensions
│
├── modes/                       # Different viewing modes
│   ├── basic-dev-mode/          # Basic development mode
│   ├── longitudinal/           # Longitudinal mode
│   └── ...                     # Other modes
│
└── tests/                       # E2E tests
```

---

## 🏠 HOME SCREEN - Study List (WorkList)

The home screen displays a list of studies that users can search, filter, and select.

### Key Files:

#### 1. **Main WorkList Component** (Home Screen)
📄 `platform/app/src/routes/WorkList/WorkList.tsx`
- **Purpose**: Main component that renders the study list/worklist page
- **Features**:
  - Study search and filtering
  - Pagination
  - Sorting
  - Study selection
  - Navigation to viewer
- **Key Components Used**:
  - `StudyListTable` - Renders the study table
  - `StudyListFilter` - Search/filter controls
  - `StudyListPagination` - Pagination controls
  - `EmptyStudies` - Empty state

#### 2. **Study List Table Component**
📄 `platform/ui/src/components/StudyListTable/StudyListTable.tsx`
- **Purpose**: Renders the actual table with study rows
- **Usage**: Used by WorkList to display study data in a table format

#### 3. **Route Configuration**
📄 `platform/app/src/routes/index.tsx`
- **Purpose**: Defines routing structure
- **Key Route**: `/` → `WorkList` component (line 114-118)
- **Flow**: 
  - User visits `/` → `DataSourceWrapper` → `WorkList`
  - Clicking a study navigates to viewer mode

#### 4. **Study List Filter Metadata**
📄 `platform/app/src/routes/WorkList/filtersMeta.js`
- **Purpose**: Defines filter options and metadata for the study list

---

## 🖼️ VIEWER SCREEN - Study Viewer

The viewer screen displays medical images with viewports, panels, and tools.

### Key Files:

#### 1. **Main Viewer Layout**
📄 `extensions/default/src/ViewerLayout/index.tsx`
- **Purpose**: Main layout component for the viewer
- **Structure**:
  - Left Panel (Study Browser) - Shows series thumbnails
  - Center Viewport Grid - Displays medical images
  - Right Panel - Measurements, annotations, etc.
  - Header - Toolbar and navigation
- **Key Features**:
  - Resizable panels
  - Viewport grid management
  - Panel service integration

#### 2. **Mode Route Handler**
📄 `platform/app/src/routes/Mode/Mode.tsx`
- **Purpose**: Handles routing to different viewer modes
- **Responsibilities**:
  - Loads extensions for the mode
  - Initializes viewports
  - Sets up hanging protocols
  - Manages study instance UIDs from URL

#### 3. **Study Browser Panel** (Left Panel)
📄 `extensions/default/src/Panels/StudyBrowser/PanelStudyBrowser.tsx`
- **Purpose**: Displays study and series thumbnails in the left panel
- **Features**:
  - Shows all studies for a patient
  - Displays series thumbnails
  - Handles thumbnail clicks
  - Manages display sets
  - Tabs for different views (All, Recent, etc.)

#### 4. **Viewport Grid Component**
📄 `platform/ui-next/src/components/Viewport/ViewportGrid.tsx`
📄 `platform/app/src/components/ViewportGrid.tsx`
- **Purpose**: Renders the grid of viewports for displaying images
- **Usage**: Managed by ViewerLayout, displays multiple viewports simultaneously

#### 5. **Study Browser UI Component**
📄 `platform/ui-next/src/components/StudyBrowser/StudyBrowser.tsx`
- **Purpose**: Reusable UI component for study browser
- **Usage**: Used by PanelStudyBrowser to render study items and thumbnails

---

## 🔄 Data Flow

### Home Screen → Viewer Flow:

```
1. User visits "/" (root)
   ↓
2. WorkList component loads
   ↓
3. Queries data source for studies
   ↓
4. Displays studies in StudyListTable
   ↓
5. User clicks on a study
   ↓
6. Navigates to "/viewer?StudyInstanceUIDs=..."
   ↓
7. ModeRoute component loads
   ↓
8. ViewerLayout component renders
   ↓
9. PanelStudyBrowser fetches study data
   ↓
10. ViewportGrid displays images
```

---

## 📦 Key Directories Explained

### `platform/app/`
- **Main application code**
- Routing, entry point, app configuration
- Routes: WorkList, Mode, DataSourceWrapper

### `platform/core/`
- **Business logic**
- Services (DisplaySetService, PanelService, etc.)
- Utilities and types

### `platform/ui-next/`
- **Modern UI components**
- React components with Tailwind CSS
- StudyBrowser, ViewportGrid, Header, etc.

### `extensions/default/`
- **Default extension**
- ViewerLayout, Panels (StudyBrowser), Components
- Default datasource implementations

### `extensions/cornerstone/`
- **Image rendering**
- Viewport components for displaying DICOM images
- Uses Cornerstone3D library

---

## 🎯 Quick Reference

| Screen | Main Component | Location |
|--------|---------------|----------|
| **Home/Study List** | `WorkList` | `platform/app/src/routes/WorkList/WorkList.tsx` |
| **Study Table** | `StudyListTable` | `platform/ui/src/components/StudyListTable/` |
| **Viewer Layout** | `ViewerLayout` | `extensions/default/src/ViewerLayout/index.tsx` |
| **Left Panel (Studies)** | `PanelStudyBrowser` | `extensions/default/src/Panels/StudyBrowser/` |
| **Viewport Grid** | `ViewportGrid` | `platform/ui-next/src/components/Viewport/` |
| **Routing** | `index.tsx` | `platform/app/src/routes/index.tsx` |

---

## 🔍 Where to Look for Changes

### To modify the study list:
- Edit `platform/app/src/routes/WorkList/WorkList.tsx`
- Modify table: `platform/ui/src/components/StudyListTable/`
- Update filters: `platform/app/src/routes/WorkList/filtersMeta.js`

### To modify the viewer:
- Edit layout: `extensions/default/src/ViewerLayout/index.tsx`
- Edit study browser: `extensions/default/src/Panels/StudyBrowser/PanelStudyBrowser.tsx`
- Edit viewports: `platform/ui-next/src/components/Viewport/`

### To add new routes:
- Edit: `platform/app/src/routes/index.tsx`

