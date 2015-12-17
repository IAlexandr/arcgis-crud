var request = require('superagent');
var request2 = require('request');
var fs = require('fs');
var _ = require('underscore');
var urlencode = require('urlencode');

// callback(err, fl)
module.exports.connect = function (fsUrl, callback) {
  // todo: Обработать fsUrl, достраивая его при необходимости url
  try {
    request
      .get(fsUrl)
      .query({ f: 'json' })
      .accept('json')
      .end(function (err, res) {
        if (err) {
          console.log('!!!!');
          return callback(err);
        }
        try {
          var fsInfo = JSON.parse(res.text);
        } catch (e) {
          return callback(new Error('Passed URL seems to be not an Arcgis FeatureServer REST endpoint'));
        }

        // todo: Сделать более широкую проверку типа слоя
        if (!(fsInfo.type && fsInfo.type === 'Feature Layer')) {
          return callback(new Error('Passed URL seems to be not an Arcgis FeatureServer REST endpoint'));
        }

        return callback(null, new FeatureServer(fsUrl, fsInfo));
      });
  } catch (e) {
    return callback(new Error('Incorrect URL or similar error.'));
  }
};

var FeatureServer = function (fsUrl, fsInfo) {
  this.fsUrl = fsUrl;
  this.fsInfo = fsInfo;
};

// http://si-sdiis/arcgis/sdk/rest/index.html#//02ss0000002r000000
FeatureServer.prototype.query = function (options, callback) {
  var params = _.defaults(options, {
    outFields: '*',
    returnGeometry: false
  });

  // Если в objectIds массив, преобразуем его в строку
  if (_.isArray(params.objectIds)) {
    params.objectIds = params.objectIds.join(', ');
  }

  params.f = 'json';

  request
    .get(this.fsUrl + '/query')
    .query(params)
    .end(function (err, res) {
      if (err) {
        return callback(err);
      }
      if (!res.ok) {
        return callback(new Error('Query error (serer response not ok).'));
      }

      try {
        var resBody = JSON.parse(res.text);
      } catch (e) {
        return callback(new Error('Query error (JSON parse error).'));
      }

      if (!!resBody.error) {
        // todo: error.message содержит больше данных
        return callback(new Error('Arcgis server: ' + resBody.error.message));
      }

      return callback(null, resBody);
    });
};

FeatureServer.prototype.queryCount = function (options, callback) {
  options.returnCountOnly = true;
  this.query(options, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (!result.hasOwnProperty('count')) {
      return callback(new Error('Query result error: no count property returned.'));
    }

    return callback(null, result.count);
  });
};

// http://si-sdiis/arcgis/sdk/rest/index.html#/Update_Features/02ss00000096000000/
FeatureServer.prototype.update = function (features, callback) {
  request
    .post(this.fsUrl + '/updateFeatures')
    .type('form')
    .send({ f: 'json' })
    .send({ features: JSON.stringify(features) })
    .on('error', function (err) {
      return callback(err);
    })
    .end(function (err, res) {
      if (err) {
        return callback(err);
      }
      if (!res.ok) {
        return callback(new Error('Query error (server response not ok).'));
      }

      try {
        var resBody = JSON.parse(res.text);
      } catch (e) {
        return callback(new Error('Query error (JSON parse error).'));
      }

      if (!!resBody.error) {
        // todo: error.message содержит больше данных
        console.log('*** arcgis err, full body ***');
        console.log(resBody);
        console.log('*****************************');
        return callback(new Error('Arcgis server: ' + resBody.error.message));
      }

      if (!resBody.updateResults) {
        // todo: error.message содержит больше данных
        return callback(new Error('Update error.'));
      }

      return callback(null, resBody.updateResults);
    });
};

// http://si-sdiis/arcgis/sdk/rest/index.html#/Add_Features/02ss0000009m000000/
FeatureServer.prototype.add = function (features, callback) {
  request
    .post(this.fsUrl + '/addFeatures')
    .type('form')
    .send({ f: 'json' })
    .send({ features: JSON.stringify(features) })
    .end(function (err, res) {
      if (err) {
        return callback(err);
      }
      if (!res.ok) {
        return callback(new Error('Query error (server response not ok).'));
      }

      try {
        var resBody = JSON.parse(res.text);
      } catch (e) {
        return callback(new Error('Query error (JSON parse error).'));
      }

      if (!!resBody.error) {
        // todo: error.message содержит больше данных
        console.log('*** arcgis err, full body ***');
        console.log(resBody);
        console.log('*****************************');
        return callback(new Error('Arcgis server: ' + resBody.error.message));
      }

      if (!resBody.addResults) {
        // todo: error.message содержит больше данных
        return callback(new Error('Add error.'));
      }

      return callback(null, resBody.addResults);
    });
};
// todo доделать, пока реализовано удаление с where
FeatureServer.prototype.delete = function (options, callback) {
  var params = options;
  params.f = 'json';
  request
    .post(this.fsUrl + '/deleteFeatures')
    .type('form')
    .send(params)
    // .send({ features: JSON.stringify(features) })
    .end(function (err, res) {
      if (err) {
        return callback(err);
      }
      if (!res.ok) {
        return callback(new Error('Query error (server response not ok).'));
      }

      try {
        var resBody = JSON.parse(res.text);
      } catch (e) {
        return callback(new Error('Query error (JSON parse error).'));
      }

      if (!!resBody.error) {
        // todo: error.message содержит больше данных
        console.log('*** arcgis err, full body ***');
        console.log(resBody);
        console.log('*****************************');
        return callback(new Error('Arcgis server: ' + resBody.error.message));
      }

      /*if (!resBody.deleteResults) {
       // todo: error.message содержит больше данных
       return callback(new Error('Delete error.'));
       }*/

      return callback(null, resBody.deleteResults);
    });
};

FeatureServer.prototype.addAttachment = function (objId, filePath, callback) {
  var rs = fs.createReadStream(filePath);
  var url = this.fsUrl + "/" + objId + "/addAttachment";

  var r = request2.post(url, function (err, resp, body) {
    callback(err); // TODO
  });
  var form = r.form();
  form.append('f', 'json');
  form.append('attachment', rs);
};

FeatureServer.prototype.addAttachmentUrl = function (objId, fileUrl, callback) {
  str = "";
  url = fileUrl.split("/");
  for (var i = 0; i < url.length; i++) {
    if (i == url.length - 1){
      str += "/" + urlencode(url[i]);
    } else {
      str += url[i] + "/";
    }
  }

  var file = fs.createWriteStream('attachment.jpg');

  file.on('close', () => {
    request
    .post(this.fsUrl + "/" + objId + "/addAttachment")
    .attach('attachment', path.join(process.cwd() + '\\attachment.jpg'))
    .end((err)=> {
      callback();
    });
  });

  request2.get(str).pipe(file);
};

FeatureServer.prototype.attachmentInfos = function (objId, callback) {
  var url = this.fsUrl + "/" + objId + "/attachments";

  var r = request2.post(url, function (err, resp, body) {
    callback(err, resp, body); // TODO
  });
  var form = r.form();
  form.append('f', 'json');
};
