import * as Joi from 'joi';

export default {
  // POST /api/users
  createUser: {
    body: {
      code: Joi.string(),
      state: Joi.string(),
    }
  },
  confirmExistence: {
    body: {
      account: Joi.string().required(),
    }
  },
  createPost: {
    body: {
      author: Joi.string().required(),
      permlink: Joi.string().required(),
    }
  },
  editPost: {
    body: {
      author: Joi.string().required(),
      permlink: Joi.string().required(),
      title: Joi.string().required(),
      body: Joi.string().required(),
      json_metadata: Joi.object().required()
    }
  },
  createSponsor: {
    body: {
      sponsor: Joi.string().required(),
    }
  },
  createProjectSponsor: {
    body: {
      sponsor: Joi.string().required(),
    }
  },
  voteWithSponsors: {
    body: {
      author: Joi.string().required(),
      permlink: Joi.string().required(),
      vote: Joi.number().required()
    }
  },
  createProject: {
    body: {
      owner: Joi.string().required(),
      platform: Joi.string().required(),
      external_id: Joi.number().required(),
      project_name: Joi.string().required(),
    }
  },
  banUser: {
    body: {
      account: Joi.string(),
      banned: Joi.number().integer().min(0).max(9),
      bannedBy: Joi.string(),
      banReason: Joi.string(),
    },
    params: {
      userId: Joi.string(),
    }
  },
  createMod: {
    body: {
      account: Joi.string().required(),
      referrer: Joi.string(),
    },
    params: {}
  },
  removeMod: {
    body: {
      account: Joi.string().required(),
    },
    params: {}
  },
  login: {
    body: {
      code: Joi.string().required(),
    },
    params: {}
  },
  // SOCIAL LOGIN
  socialLogin: {
    body: {
      code: Joi.string(),
      state: Joi.string(),
      redirectUri: Joi.string()
    },
    params: {
      provider: Joi.string().valid('github', 'facebook', 'linkedin').required()
    }
  },
  emailRequest: {
    body: {
      user_id: Joi.string().required(),
      email: Joi.string().required()
    }
  },
  emailConfirm: {
    body: {
      token: Joi.string().required()
    }
  },
  phoneRequest: {
    body: {
      user_id: Joi.string().required(),
      country_code: Joi.string().required(),
      phone_number: Joi.string().required()
    }
  },
  phoneConfirm: {
    body: {
      user_id: Joi.string().required(),
      code: Joi.string().required()
    }
  },
  phoneReset: {
    body: {
      user_id: Joi.string().required()
    }
  },
  accountCreate: {
    body: {
      user_id: Joi.string().required(),
      account_name: Joi.string().required(),
      owner_auth: Joi.object().required(),
      active_auth: Joi.object().required(),
      posting_auth: Joi.object().required(),
      memo_auth: Joi.object().required(),
      last_digits_password: Joi.string().required()
    }
  },
  accountAccept: {
    body: {
      user_id: Joi.string().required(),
      type: Joi.string().valid('tos', 'privacy').required()
    }
  },
  tables: {
    query: {
      limit: Joi.number().min(1)
    }
  },
  avatarUser: {
    query: {
      size: Joi.number().min(48).max(512),
      round: Joi.boolean()
    }
  },
  createFaq: {
    body: {
      title: Joi.string().required(),
      html: Joi.string().required(),
      category_name: Joi.string().required(),
      category: Joi.string().required(),
      parent_category: Joi.string()
    }
  },
  updateFaq: {
    body: {
      id: Joi.string().required(),
      title: Joi.string().required(),
      html: Joi.string().required(),
      category_name: Joi.string().required(),
      category: Joi.string().required(),
      parent_category: Joi.string().allow(null)
    }
  },
  listFaq: {
    query: {
      category: Joi.string(),
      parent_category: Joi.string()
    }
  },
  createRule: {
    body: {
      title: Joi.string().required(),
      html: Joi.string().required(),
      category_name: Joi.string().required(),
      category: Joi.string().required(),
      parent_category: Joi.string()
    }
  },
  updateRule: {
    body: {
      id: Joi.string().required(),
      title: Joi.string().required(),
      html: Joi.string().required(),
      category_name: Joi.string().required(),
      category: Joi.string().required(),
      parent_category: Joi.string().allow(null)
    }
  },
  listRule: {
    query: {
      category: Joi.string(),
      parent_category: Joi.string()
    }
  },

};
