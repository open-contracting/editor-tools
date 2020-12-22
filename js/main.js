// @see https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
function fields(metadata, filename, path, schema) {
  let data = [];
  // If it's an array.
  if (Array.isArray(schema)) {
    for (const entry of schema) {
      data = data.concat(fields(metadata, filename, path, entry));
    }
  }
  // If it's an object.
  else if (typeof schema === 'object' && schema !== null) {
    datum = {};
    for (const property of ['title', 'description']) {
      // If the property is set and its value is a string.
      if (property in schema && toString.call(schema[property]) == '[object String]') {
        datum[property] = schema[property];
      }
    }
    // If the schema has metadata properties.
    if (Object.keys(datum).length) {
      datum.extension = metadata;
      datum.schema = filename;
      datum.path = path;
      let types = [];
      if (toString.call(schema.type) == '[object String]') {
        types = [schema.type];
      }
      else if (schema.type) {
        types = schema.type;
      }
      const index = types.indexOf('null');
      if (index > -1) {
        types.splice(index, 1);
      }
      datum.type = types.join(', ');
      data.push(datum);
    }

    for (const property in schema) {
      let newPath;
      // Omit "definitions" and "properties" from the field's path.
      if (property == 'definitions' && path == '' || property == 'properties' && typeof schema.properties == 'object') {
        newPath = path;
      }
      else if (path == '') {
        newPath = property;
      }
      else {
        newPath = `${path}.${property}`;
      }
      data = data.concat(fields(metadata, filename, newPath, schema[property]));
    }
  }
  return data;
}

const engine = new Bloodhound({
  datumTokenizer: function (datum) {
    let tokens = [];
    for (const property in datum) {
      if (property == 'title' || property == 'description') {
        tokens = tokens.concat(Bloodhound.tokenizers.nonword(datum[property]));
      }
      else if (property == 'code') {
        // Split on non-word characters, camel case and underscores.
        // replace is used instead of split, because not all browsers implement lookbehind.
        tokens = tokens.concat(datum[property].replace(/([a-z])(?=[A-Z])/, '$1 ').split(/[\W_]+/));
      }
    }
    return tokens;
  },
  queryTokenizer: Bloodhound.tokenizers.nonword,
  prefetch: {
    url: 'https://extensions.open-contracting.org/extensions.json',
    transform: function (response) {
      let data = [];
      for (const id in response) {
        const extension = response[id];
        const version = extension.versions[extension.latest_version];
        const schema = version.schemas['release-schema.json'];
        const metadata = {
          id: id,
          version: extension.latest_version,
          name: extension.name.en
        };
        if (schema) {
          data = data.concat(fields(metadata, 'release-schema.json', '', schema.en));
        }
        for (const codelist in version.codelists) {
          for (const row of version.codelists[codelist].en.rows) {
            data.push({
              extension: metadata,
              codelist: codelist,
              code: row.Code,
              title: row.Title,
              description: row.Description
            });
          }
        }
      }
      return data;
    }
  }
});

engine.initialize().done(function () {
  $('#typeahead').typeahead({
    highlight: true
  }, {
    source: engine,
    limit: 1000,
    templates: {
      suggestion: Handlebars.compile(`
        <div class="panel panel-default">
          <div class="panel-heading">
            {{#if codelist}}
            Code:
            {{else}}
            Field:
            {{/if}}
            <strong>
              {{#if codelist}}
              {{code}}
              {{else}}
              {{path}}
              {{/if}}
            </strong>
            <span class="text-muted">
              {{#if type}}
              ({{type}})
              {{/if}}
              {{#if codelist}}
              in <a target="_blank" href="https://extensions.open-contracting.org/en/extensions/{{extension.id}}/{{extension.version}}/codelists/#{{codelist}}">{{codelist}}</a>
              {{/if}}
              in <a target="_blank" href="https://extensions.open-contracting.org/en/extensions/{{extension.id}}/{{extension.version}}/">{{extension.name}}</a>
            </span>
          </div>
          <div class="panel-body">
            <dl class="dl-horizontal">
              <dt>Title</dt>
              <dd>{{title}}</dd>
              <dt>Description</dt>
              <dd>{{description}}</dd>
            </dl>
          </div>
        </div>`)
    }
  });

  $('.panel a').on('click', function (event) {
    return false;
  });
});
