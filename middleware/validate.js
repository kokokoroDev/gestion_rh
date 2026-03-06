export const validate = (schema , source = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[source]);
  if (error) {
    return res.status(400).json({ 
      message: error.details[0].message
    });
  }
  next();
};

