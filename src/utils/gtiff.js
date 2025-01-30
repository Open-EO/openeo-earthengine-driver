import { fromFile } from 'geotiff';

export default {

  async load(filepath) {
    const geotiffFile = await fromFile(filepath);
    return await geotiffFile.getImage();
  },

  getNoData(image) {
    const nodata = image.fileDirectory.GDAL_NODATA;
    if (typeof nodata === 'string') {
      return parseFloat(nodata);
    }
    else if (typeof nodata === 'number') {
      return nodata;
    }
    else {
      return "nan";
    }
  },

  getDataType(image) {
      // Extract metadata
      const fileDirectory = image.fileDirectory;
      const sampleFormat = fileDirectory.SampleFormat ? fileDirectory.SampleFormat[0] : 1;
      const bitsPerSample = fileDirectory.BitsPerSample ? fileDirectory.BitsPerSample[0] : 8;
      if (sampleFormat === 1) { // Unsigned Integer
          if (bitsPerSample === 8) {
            return "uint8";
          }
          else if (bitsPerSample === 16) {
            return "uint16";
          }
          else if (bitsPerSample === 32) {
            return "Uint32";
          }
      }
      else if (sampleFormat === 2) { // Signed Integer
          if (bitsPerSample === 8) {
            return "int8";
          }
          else if (bitsPerSample === 16) {
            return "int16";
          }
          else if (bitsPerSample === 32) {
            return "int32";
          }
      } else if (sampleFormat === 3) { // Floating Point
          if (bitsPerSample === 32) {
            return "float32";
          }
          else if (bitsPerSample === 64) {
            return "float64";
          }
      }
      return null;
  },

  async getBands(image, names = []) {
    // Get the number of bands
    const numBands = image.getSamplesPerPixel();
    const datatype = this.getDataType(image);
    const nodata = this.getNoData(image);

    let minValues = new Array(numBands).fill(Infinity);
    let maxValues = new Array(numBands).fill(-Infinity);

    // Read raster data for all bands
    for (let band = 0; band < numBands; band++) {
        const raster = await image.readRasters({ samples: [band] });
        const data = raster[0]; // Extract data for this band

        // Compute min and max
        for (let i = 0; i < data.length; i++) {
            if (data[i] < minValues[band]) minValues[band] = data[i];
            if (data[i] > maxValues[band]) maxValues[band] = data[i];
        }
    }

    let bands = [];
    for (let i = 0; i < numBands; i++) {
      const obj = {
        name: names[i] || String(i),
        statistics: {
          minimum: minValues[i],
          maximum: maxValues[i]
        },
        nodata
      };
      if (datatype) {
        obj.data_type = datatype;
      }
      bands.push(obj);
    }

    return bands;
  },

  getGeoTransform(image) {
    const fd = image.fileDirectory;
    if (fd.ModelTransformation) {
      const t = fd.ModelTransformation;
      return [t[0], t[1], t[3], t[4], t[5], t[7]];
    }
    else if (fd.ModelTiepoint && fd.ModelPixelScale) {
      const s = fd.ModelPixelScale;
      const t = fd.ModelTiepoint;
      return [t[3], s[0], 0, t[4], 0, -s[1]];
    }
    return null;
  }

};
