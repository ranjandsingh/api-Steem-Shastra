import Rule from '../models/rule.model';


function list(req, res, next) {

  const {category, parent_category} = req.query;

  Rule.list(category, parent_category)
    .then(rules => res.json({
      total: rules.length,
      results: rules
    }))
    .catch(e => (e) => {res.json(e)});
}

function update(req, res) {
  let {id, title, html, category_name, category, parent_category} = req.body;

  if (parent_category === null) parent_category = undefined;

  let newRule = {
    title: title,
    hash: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    html: html,
    category_name: category_name,
    category: category
  };

  if (parent_category) {
    newRule['parent_category'] = parent_category
  }

  Rule.findOneAndUpdate({"_id": id}, newRule, (err, rule) => {
    res.json(rule)
  })
}

function create(req, res) {
  const {title, html, category, category_name, parent_category} = req.body;

  const rule = new Rule({
    title: title,
    hash: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    html: html,
    category_name: category_name,
    category: category,
    parent_category: parent_category
  });
  rule.save().then(() => {
    res.json({
      title: title,
      hash: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      html: html,
      category_name: category_name,
      category: category,
      parent_category: parent_category
    });
  }).catch((err) => res.status(500).json({error_message: err}));

}

export default {create, list, update};
