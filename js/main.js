// @see https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
const engine = new Bloodhound({
  datumTokenizer: function (datum) {
    let tokens = [];
    for (const property in datum) {
      if (property == 'title' || property == 'description') {
        tokens = tokens.concat(Bloodhound.tokenizers.nonword(datum[property]));
      }
      else if (property == 'name') {
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
    // TODO
    cache: false,
    transform: function (response) {
      let data = [];
      for (const id in response) {
        const extension = response[id];
        const version = extension.versions[extension.latest_version];
        const schema = version.schemas['release-schema.json'];
        if (schema) {
          // TODO
          schema['en']
        }
        for (const codelist in version.codelists) {
          for (const row of version.codelists[codelist]['en'].rows) {
            data.push({
              extension: id,
              version: extension.latest_version,
              codelist: codelist,
              name: row['Code'],
              title: row['Title'],
              description: row['Description']
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
            <strong>{{name}}</strong>
            <span class="text-muted">
              {{#if codelist}}
              from <a target="_blank" href="https://extensions.open-contracting.org/en/extensions/{{extension}}/{{version}}/codelists/#{{codelist}}">{{codelist}}</a>
              {{/if}}
              in <a target="_blank" href="https://extensions.open-contracting.org/en/extensions/{{extension}}/{{version}}/">{{extension}}</a>
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
