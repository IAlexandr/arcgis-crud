var arcgis = require('./index');

var featureLayer = arcgis.featureLayer;

featureLayer.connect(
  'http://sampleserver6.arcgisonline.com/arcgis/rest/services/CommercialDamageAssessment/FeatureServer/0',
  function (err, Fs) {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Test FeatureLayer connected.');
      Fs.query({ returnIdsOnly: true, where: '1=1' }, function (err, result) {
        if (err) {
          console.error(err.message);
        } else {
          console.log('get objs by query 1=1: ', result.objectIds.length);
        }
      });
    }
  }
);
