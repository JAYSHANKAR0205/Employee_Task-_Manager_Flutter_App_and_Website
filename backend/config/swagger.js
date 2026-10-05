/**
 * swagger.js
 * Configuration for Swagger (OpenAPI 3.0) API documentation.
 * Configures title, version, servers, security schemes (JWT Bearer Token),
 * tags, reusable component schemas, and JSDoc scanning paths.
 */

const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Registration & Login Authentication API',
      version: '1.0.0',
      description: 'Enterprise Authentication System with Registration, Login, OTP Verification, Forgot Password, Reset Password, Google Login, User Profile and JWT Authentication.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and Google OAuth endpoints'
      },
      {
        name: 'OTP',
        description: 'One-Time Password verification and management'
      },
      {
        name: 'Profile',
        description: 'User profile management endpoints'
      },
      {
        name: 'Users',
        description: 'User directory and administrative operations'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authorization: Bearer <JWT_TOKEN>'
        }
      },
      schemas: {
        // --- Core Entity Schemas ---
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '669c5e8b4f1a2b3c4d5e6f7a' },
            firstName: { type: 'string', example: 'Alex' },
            lastName: { type: 'string', example: 'Rivera' },
            email: { type: 'string', format: 'email', example: 'alex.rivera@example.com' },
            phoneNumber: { type: 'string', example: '+919876543210' },
            dateOfBirth: { type: 'string', format: 'date', example: '2000-01-15' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
            qualification: { type: 'string', enum: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other'], example: 'Graduation' },
            bio: { type: 'string', example: 'Full-stack software developer & UI designer.' },
            isVerified: { type: 'boolean', example: true },
            authProvider: { type: 'string', enum: ['local', 'google'], example: 'local' },
            googleId: { type: 'string', example: '109238409238' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-07-20T10:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-07-20T10:00:00.000Z' }
          }
        },
        OTP: {
          type: 'object',
          required: ['otp'],
          properties: {
            otp: {
              type: 'string',
              description: '6-digit One-Time Password',
              pattern: '^[0-9]{6}$',
              example: '584920'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration timestamp (5 minutes duration)',
              example: '2026-07-20T10:05:00.000Z'
            }
          }
        },
        Authentication: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JSON Web Token (JWT)',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2OWM1ZThiNGYxYTJiM2M0ZDVlNmY3YSIsImlhdCI6MTcyMTQ3MjAwMCwiZXhwIjoxNzI0MDY0MDAwfQ.signature'
            }
          }
        },

        // --- Standard Request Schemas ---
        RegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'phoneNumber', 'password', 'dateOfBirth', 'gender', 'qualification'],
          properties: {
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 30,
              pattern: "^[A-Za-z\\-']+$",
              description: 'Required. 2–30 characters. Letters, hyphen, apostrophe only.',
              example: 'Alex'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 30,
              pattern: "^[A-Za-z\\s\\-']+$",
              description: 'Required. 2–30 characters. Letters, spaces, hyphen, apostrophe only.',
              example: 'Rivera'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Required. Lowercase, valid format, unique.',
              example: 'alex.rivera@example.com'
            },
            phoneNumber: {
              type: 'string',
              description: 'Required. E.164 format with country code.',
              example: '+919876543210'
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 99,
              description: 'Required. Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.',
              example: 'Password@123'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Required. Past date (Date of Birth).',
              example: '2000-01-15'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other'],
              description: 'Required.',
              example: 'Male'
            },
            qualification: {
              type: 'string',
              enum: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other'],
              description: 'Required.',
              example: 'Graduation'
            },
            bio: {
              type: 'string',
              maxLength: 500,
              description: 'Optional bio (max 500 characters).',
              example: 'Full-stack software developer & UI designer.'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'alex.rivera@example.com'
            },
            password: {
              type: 'string',
              example: 'Password@123'
            }
          }
        },
        VerifyOTPRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'alex.rivera@example.com'
            },
            otp: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: '6-digit OTP code sent via email',
              example: '584920'
            }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'alex.rivera@example.com'
            }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'otp', 'newPassword'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'alex.rivera@example.com'
            },
            otp: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              example: '584920'
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.',
              example: 'NewPassword@456'
            }
          }
        },
        GoogleLoginRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'OAuth 2.0 Access Token received from Google Auth provider',
              example: 'ya29.a0AfB_byC...'
            }
          }
        },
        GoogleRegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'phoneNumber', 'dateOfBirth', 'gender', 'qualification', 'googleId'],
          properties: {
            firstName: { type: 'string', example: 'Alex' },
            lastName: { type: 'string', example: 'Rivera' },
            email: { type: 'string', format: 'email', example: 'alex.rivera@gmail.com' },
            phoneNumber: { type: 'string', example: '+919876543210' },
            dateOfBirth: { type: 'string', format: 'date', example: '2000-01-15' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
            qualification: { type: 'string', enum: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other'], example: 'Graduation' },
            bio: { type: 'string', example: 'Google authenticated user.' },
            googleId: { type: 'string', example: '1092384092384092' }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'Alex' },
            lastName: { type: 'string', example: 'Rivera' },
            phoneNumber: { type: 'string', example: '+919876543210' },
            dateOfBirth: { type: 'string', format: 'date', example: '2000-01-15' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
            qualification: { type: 'string', enum: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other'], example: 'Graduation' },
            bio: { type: 'string', example: 'Updated bio description.' }
          }
        },

        // --- Standard Response Schemas ---
        SuccessResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation completed successfully.' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '669c5e8b4f1a2b3c4d5e6f7a' },
            firstName: { type: 'string', example: 'Alex' },
            lastName: { type: 'string', example: 'Rivera' },
            email: { type: 'string', example: 'alex.rivera@example.com' },
            phoneNumber: { type: 'string', example: '+919876543210' },
            dateOfBirth: { type: 'string', example: '2000-01-15T00:00:00.000Z' },
            gender: { type: 'string', example: 'Male' },
            qualification: { type: 'string', example: 'Graduation' },
            bio: { type: 'string', example: 'Full-stack software developer & UI designer.' },
            isVerified: { type: 'boolean', example: true },
            authProvider: { type: 'string', example: 'local' },
            createdAt: { type: 'string', example: '2026-07-20T10:00:00.000Z' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'An error occurred while processing your request.' }
          }
        },
        ValidationErrors: {
          type: 'object',
          properties: {
            validationErrors: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: {
                email: 'Enter a valid email address.',
                password: 'Password contain:\n-One uppercase,\n-One lowercase, -One number,\n-One special character.'
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './routes/*.js',
    './routes/*.ts',
    './server.js'
  ]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
