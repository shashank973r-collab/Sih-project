"""
DepthWizard Backend Server (FastAPI)
ISRO Smart India Hackathon 2026 - Problem Statement 26175
Serves REST API for single-view elevation estimation, point probing, and 3D GLB streaming.
"""

import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from .pipeline import ElevationPipeline

app = FastAPI(
    title="DepthWizard Elevation Intelligence API",
    version="1.0.0",
    description="Backend API for ISRO PS-26175 Single-View Height Estimation & 3D Flythrough"
)

# Enable CORS for local dev frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize output artifact directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
pipeline = ElevationPipeline(output_dir=OUTPUT_DIR)


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "DepthWizard Elevation Engine",
        "version": "1.0.0",
        "isro_problem_statement": "26175"
    }


@app.post("/api/v1/elevation/estimate")
async def estimate_elevation(
    image: UploadFile = File(...),
    calibration_mode: str = Form("level_1_srtm"),
    gcp_file: Optional[UploadFile] = File(None)
):
    """
    Accepts optical imagery (GeoTIFF or PNG/JPG) and produces calibrated elevation raster + 3D mesh.
    """
    try:
        image_bytes = await image.read()
        gcp_bytes = await gcp_file.read() if gcp_file else None

        result = pipeline.process_image(
            image_bytes=image_bytes,
            filename=image.filename or "image.tif",
            calibration_mode=calibration_mode,
            gcp_csv_bytes=gcp_bytes
        )

        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")


@app.get("/api/v1/elevation/probe")
async def probe_elevation(
    job_id: str = Query(...),
    x: float = Query(...),
    y: float = Query(...)
):
    """
    Calculates height, slope, aspect, and coordinates at normalized (x, y) coordinates.
    """
    probe_result = pipeline.probe_point(job_id=job_id, x=x, y=y)
    if not probe_result:
        raise HTTPException(status_code=404, detail="Job ID not found or point out of bounds")
    return JSONResponse(content=probe_result)


@app.get("/api/v1/elevation/download/{filename}")
async def download_file(filename: str):
    """
    Streams generated GeoTIFF rasters or GLB 3D meshes.
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested artifact not found")

    media_type = "model/gltf-binary" if filename.endswith(".glb") else "image/tiff"
    return FileResponse(file_path, media_type=media_type, filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
