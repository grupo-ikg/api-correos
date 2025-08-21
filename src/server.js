require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");
const docusign = require("docusign-esign");
const fs = require("fs");
const path = require("path");
const basicAuth = require("basic-auth");

const app = express();

const PORT = process.env.PORT || 4000;
const jwt = require("jsonwebtoken");
const tokenExpiration = "1h";
const secretKey = process.env.SECRET_JWT;

const swStats = require("swagger-stats");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const treble = require("./portal_intermediario.js");
const trebleClient = require("./portal_cliente.js");
const { json } = require("body-parser");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "desarrolladorweb@cavca.com.co", // Cambia esto con tu dirección de correo electrónico de Gmail
    pass: "kprk xqvk wzbq bjph", // Cambia esto con tu contraseña de correo electrónico de Gmail
  },
});

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "API de backend - bridge",
      description: "Documentación de la API de backend de puente para conexiones con diferentes plataformas",
      contact: {
        name: "Cavca",
        url: "https://cavcaseguros.com/",
      },
      servers: ["http://localhost:4000","https://crediseguro-back.click/"],
    },
    components: {
      securitySchemes: {
        ApiTokenAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Token de autorización generado por la API",
        },
      },
    },
    security: [{ ApiTokenAuth: [] }],
  },
  basePath: "/",
  apis: ["src/server.js"],
};

// Autenticación básica para acceder a Swagger
const authenticateSwagger = (req, res, next) => {
  const user = basicAuth(req);
  if (!user || user.name !== "docs-user" || user.pass !== "pass2025*") {
    res.setHeader("WWW-Authenticate", 'Basic realm="Swagger API"');
    return res.status(401).send("Acceso no autorizado");
  }
  next();
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

app.use(
  "/api-docs",
  authenticateSwagger,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs)
);

function getToken(req, res, next) {
  try {
    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/oauth2/token?client_id=3MVG9Kip4IKAZQEUlyFdDD9WcTyDDBuIutxE0WbcmTdXUvEMFQaH7UnNZSogacikiF29SzwJ5gsuB_z9B.fYk&client_secret=55DF5BCCC7D765601D74D7B413081145B6D81066BD0C7811C336CD82B587B921&username=Jescobar@crediseguro.co&password=SalesCredi202601&grant_type=password",
    })
      .then(({ data }) => {
        req.token = data.access_token;
        next();
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
}

function getTokenDev(req, res, next) {
  try {
    axios({
      method: "POST",
      url: "https://test.salesforce.com/services/oauth2/token?client_id=3MVG9M00uNbhCYzD952QPLa4Bitdt6XfZn9M1Cg6udqLGolSfcKVDWUblemq8_jyQ15UaYl6pmArXjEeEUf_6&client_secret=DB2E5F3F5574CAFB829064EFE7566DF91052D31130B3E59399763E4E5F2E85C8&username=jescobar@crediseguro.co.desarrollo&password=SalesCredi202601&grant_type=password",
    })
      .then(({ data }) => {
        req.token = data.access_token;
        next();
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
}

// Función para generar un token JWT basado en client_id y client_secret
function generateToken(clientId, clientSecret) {
  // Validar que client_id y client_secret sean correctos
  if (
    clientId !== process.env.VALID_CLIENT_ID ||
    clientSecret !== process.env.VALID_CLIENT_SECRET
  ) {
    throw new Error("Invalid client credentials");
  }

  const payload = { clientId: clientId };

  const token = jwt.sign(payload, secretKey, {
    expiresIn: tokenExpiration,
  });

  return token;
}

// Función para validar un token JWT
function validateToken(token) {
    try {
        const decoded = jwt.verify(token, secretKey);
        return { valid: true, decoded: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Middleware para validar el token JWT en una ruta protegida
function verifyToken(req, res, next) {
    const token = req.headers['authorization']; // El token debe enviarse en la cabecera 'Authorization'

    if (!token || token.trim() === "") {
      console.log("No token provided. Request stopped.");
      return res
        .status(403)
        .send({ auth: false, message: "No token provided." });
    }

    const validation = validateToken(token);

    if (!validation.valid) {
        return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' });
    }else{
      req.client = validation.decoded; // Guarda los datos decodificados en req.client
      next(); // Continúa con la siguiente función o ruta
    }


}

async function createToken (userIdSender) {
  return new Promise(function (resolve) {
    let key = fs.readFileSync(
      path.join(__dirname, "../key/privateOtacc.key")
    );

    if (userIdSender === "4095dee1-7ed5-4dd9-be1d-c59ce524f7df") {
      key = fs.readFileSync(
        path.join(__dirname, "../key/privateDev.key")
      );
    }
    let dsApiClient = new docusign.ApiClient();

    dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);

    const results = dsApiClient.requestJWTUserToken(
      process.env.DOCUSIGN_CLIENT_ID,
      process.env.DOCUSIGN_USER_ID,
      "signature",
      key,
      3600
    );

    results
      .then(function (result) {

        resolve(result.body);
        return result.body;
      })
      .catch(async function (error) {



        if (
          error.response.data.error ||
          error.response.body.error === "consent_required"
        ) {
          let scopes = "signature";
          let consentUrl =
            process.env.DOCUSIGN_URL +
            "?response_type=code&scope=impersonation+" +
            scopes +
            "&client_id=" +
            process.env.DOCUSIGN_CLIENT_ID +
            "&redirect_uri=" +
            process.env.DOCUSIGN_REDIRECT_URI;

          resolve(consentUrl);
          return consentUrl;
        } else {
          resolve("error");
          return "error";
        }
      });
  });
};

function getTokenDevCavca(req, res, next) {
  try {
    axios({
      method: "POST",
      url: "https://cavca--preproducc.sandbox.my.salesforce.com/services/oauth2/token?client_id=3MVG9snQZy6aQDh1bhQninXsB8Ni29MY3WL13Q7PLudHWJlWZ7C.HC.x3vpgTeRtni3cn_51NfH5B7uPVN9Kg&client_secret=AFCD7D8AD775E88A57A4CAC1B459D71DFA337644131C6476D69110EDDACBFF07&username=desarrolladorsc1@cavca.com.co.preproducc&password=Tecnologia2025&grant_type=password",
    })
      .then(({ data }) => {
        req.token = data.access_token;
        next();
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
}

function getTokenCavca(req, res, next) {
  try {
    axios({
      method: "POST",
      url: "https://cavca.my.salesforce.com/services/oauth2/token?client_id=3MVG9xOCXq4ID1uEenhA9sUsBPKBncjaQqzr727l.kNd8XorJCr9PPXuo_.jqS35HDHdbUhDzM2PhIuo5QG1a&client_secret=1641A15D74802AA565C323F7AA9D358141D36518D7CE6113842B0FCA0B3EB547&username=desarrolladorsc1@cavca.com.co&password=Tecnologia2025&grant_type=password",
    })
      .then(({ data }) => {
        req.token = data.access_token;
        next();
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
}

app.use(
  swStats.getMiddleware({
    name: "api-catalog",
    authentication: true,
    onAuthenticate: function (req, username, password) {
      // simple check for username and password
      return username === "admin" && password === "pass2025*";
    },
    elasticsearch: "http://myelastic.com:9200",
    elasticsearchUsername: "admin",
    elasticsearchPassword: "secret",
    elasticsearchIndexPrefix: "book-catalog-",
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb" }));

app.use(cors());



/**
 * @swagger
 * /generate-token:
 *   get:
 *     summary: Generate authentication token
 *     tags:
 *       - token
 *     description: Generates a token based on the provided clientId and clientSecret.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: clientId
 *         description: The client ID required for token generation.
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: clientSecret
 *         description: The client secret required for token generation.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR..."
 *       401:
 *         description: Unauthorized. Token generation failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid clientId or clientSecret"
 */
app.get("/generate-token", (req, res) => {
  const { clientId, clientSecret } = req.query;

  try {
    const token = generateToken(clientId, clientSecret);
    res.json({ auth: true, token: token });
  } catch (error) {
    res.status(401).send({ auth: false, message: error.message });
  }
});

/**
 * @swagger
 * /send:
 *   post:
 *     summary: Send an email
 *     tags:
 *       - mail
 *     description: Sends an email with the specified details.
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - destinatario
 *             - asunto
 *             - mensaje
 *             - codigo
 *           properties:
 *             destinatario:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of email recipients.
 *               example: ["recipient1@example.com", "recipient2@example.com"]
 *             asunto:
 *               type: string
 *               description: Subject of the email.
 *               example: "Test Subject"
 *             mensaje:
 *               type: string
 *               description: Plain text content of the email.
 *               example: "This is a test email."
 *             codigo:
 *               type: string
 *               description: HTML content of the email.
 *               example: "<h1>Email Content</h1>"
 *     responses:
 *       200:
 *         description: Email sent successfully.
 *         content:
 *           application/json:
 *             example:
 *               message: "Correo electrónico enviado con éxito"
 *       500:
 *         description: Failed to send the email.
 *         content:
 *           application/json:
 *             example:
 *               error: "Error al enviar el correo electrónico"
 */

app.post("/send", (req, res) => {
  const { destinatario, asunto, mensaje, codigo } = req.body;

  const mailOptions = {
    from: "desarrolladorweb@cavca.com.co",
    to: [destinatario[0], destinatario[1]],
    subject: asunto,
    text: mensaje,
    html: codigo,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error al enviar el correo electrónico");
    } else {
      console.log("Correo electrónico enviado: " + info.response);
      res.status(200).send("Correo electrónico enviado con éxito");
    }
  });
});

/**
 * @swagger
 * /sendDocs:
 *   post:
 *     summary: Send email with attached documents
 *     tags:
 *       - mail
 *     description: Sends an email with specified parameters and attached documents.
 *     parameters:
 *       - name: type
 *         in: query
 *         description: Type of email (e.g., "doc").
 *         required: false
 *         schema:
 *           type: string
 *         example: "doc"
 *       - name: sender
 *         in: query
 *         description: Email addresses of the recipients, separated by commas.
 *         required: true
 *         schema:
 *           type: string
 *         example: "recipient1@example.com,recipient2@example.com"
 *       - name: subject
 *         in: query
 *         description: Subject of the email.
 *         required: true
 *         schema:
 *           type: string
 *         example: "Document Submission"
 *       - name: text
 *         in: query
 *         description: Text content of the email.
 *         required: false
 *         schema:
 *           type: string
 *         example: "Please find the attached documents."
 *       - name: document
 *         in: query
 *         description: Document identifier.
 *         required: false
 *         schema:
 *           type: string
 *         example: "123456"
 *       - name: plate
 *         in: query
 *         description: Plate number (if applicable).
 *         required: false
 *         schema:
 *           type: string
 *         example: "XYZ123"
 *       - name: message
 *         in: query
 *         description: Message to include in the email.
 *         required: false
 *         schema:
 *           type: string
 *         example: "Attached is your requested document."
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cc:
 *                 type: string
 *                 format: binary
 *                 description: Attach a file (e.g., CC document).
 *               policy:
 *                 type: string
 *                 format: binary
 *                 description: Attach a file (e.g., policy document).
 *               other:
 *                 type: string
 *                 format: binary
 *                 description: Attach any other file.
 *     responses:
 *       200:
 *         description: Email sent successfully.
 *         content:
 *           application/json:
 *             example:
 *               message: "Correo electrónico enviado con éxito"
 *               status: 200
 *       500:
 *         description: Failed to send the email.
 *         content:
 *           application/json:
 *             example:
 *               error: "Error al enviar el correo electrónico"
 */

app.post("/sendDocs", upload.any(), (req, res) => {
  const docs = req.files;

  let mailOptions = {};

  if (req.body.type && req.body.type === "doc") {
    mailOptions = {
      from: "desarrolladorweb@cavca.com.co",
      to: req.body.sender.split(","),
      subject: `${req.body.subject}`,
      text: req.body.text,
      attachments: docs.map((doc) => ({
        filename: `${doc.originalname}.pdf`,
        content: doc.buffer,
        encoding: "base64",
      })),
    };
  } else {
    mailOptions = {
      from: "desarrolladorweb@cavca.com.co",
      to: req.body.sender,
      subject: `${req.body.subject} ${req.body.document}`,
      text: req.body.message,
      attachments: docs.map((doc) => ({
        filename: `${
          doc.fieldname === "cc"
            ? "CC"
            : doc.fieldname === "policy"
            ? "POLIZA"
            : "OTRO"
        }-${
          doc.fieldname === "policy" && req.body.plate
            ? req.body.plate
            : req.body.document
        }.pdf`,
        content: doc.buffer,
        encoding: "base64",
      })),
    };
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error al enviar el correo electrónico");
    } else {
      console.log("Correo electrónico enviado: " + info.response);
      res
        .status(200)
        .json({ message: "Correo electrónico enviado con éxito", status: 200 });
    }
  });
});

/**
 * @swagger
 * /getLocation:
 *   post:
 *     summary: Get location data based on the given parameters.
 *     tags:
 *       - general
 *     description: Fetches department and city data from Salesforce based on provided filters.
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: The body contains filters for the department and city.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             id_department:
 *               type: string
 *               description: The ID of the department to filter by.
 *             get_cities:
 *               type: boolean
 *               description: Whether to retrieve cities.
 *             get_departments:
 *               type: boolean
 *               description: Whether to retrieve departments.
 *           required:
 *             - id_department
 *             - get_cities
 *             - get_departments
 *     responses:
 *       200:
 *         description: Location data fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: The fetched location data from Salesforce.
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.post("/getLocation", getToken, (req, res) => {
  const { id_department, get_cities, get_departments } = req.body;

  try {
    const body = {
      quiereDepartamentos: get_departments,
      quiereCiudad: get_cities,
      IdParafiltrar: id_department,
    };

    console.log(body);
    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/EnvioCiudad",
      data: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
      .then(({ data }) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
});

/**
 * @swagger
 * /sendFormNewCredit:
 *   post:
 *     summary: Send new credit form data to Salesforce.
 *     tags:
 *       - salesforce
 *     description: Sends personal and credit information to Salesforce for processing.
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: The body contains the new credit application data.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             req_type:
 *               type: string
 *               description: The type of the request (e.g., new credit, modification).
 *             first_name:
 *               type: string
 *               description: The first name of the applicant.
 *             last_name:
 *               type: string
 *               description: The last name of the applicant.
 *             doc_type:
 *               type: string
 *               description: The type of document (e.g., ID, passport).
 *             num_document:
 *               type: string
 *               description: The document number.
 *             birthdate:
 *               type: string
 *               format: date
 *               description: The birthdate of the applicant.
 *             genre:
 *               type: string
 *               description: The gender of the applicant.
 *             email:
 *               type: string
 *               description: The email address of the applicant.
 *             phone:
 *               type: string
 *               description: The phone number of the applicant.
 *             job:
 *               type: string
 *               description: The job occupation of the applicant.
 *             salary:
 *               type: number
 *               description: The salary of the applicant.
 *             city:
 *               type: string
 *               description: The city where the applicant resides.
 *             address:
 *               type: string
 *               description: The address of the applicant.
 *             num_policy:
 *               type: string
 *               description: The policy number associated with the applicant.
 *             insurer_place:
 *               type: string
 *               description: The place of the insurer.
 *             insurer:
 *               type: string
 *               description: The insurer name.
 *             name_broker:
 *               type: string
 *               description: The name of the broker.
 *             nit_broker:
 *               type: string
 *               description: The NIT of the broker.
 *             broker:
 *               type: string
 *               description: The broker responsible for the credit.
 *             plate:
 *               type: string
 *               description: The vehicle plate number, if applicable.
 *             init_term:
 *               type: string
 *               description: The initial term of the credit.
 *             total_annual:
 *               type: number
 *               description: The total annual premium for the credit.
 *             init_credit:
 *               type: number
 *               description: The initial amount of the credit.
 *             num_shares:
 *               type: number
 *               description: The number of shares in the credit agreement.
 *           required:
 *             - req_type
 *             - first_name
 *             - last_name
 *             - doc_type
 *             - num_document
 *             - birthdate
 *             - genre
 *             - email
 *             - phone
 *             - job
 *             - salary
 *             - city
 *             - address
 *             - num_policy
 *             - insurer_place
 *             - insurer
 *             - name_broker
 *             - nit_broker
 *             - broker
 *             - plate
 *             - init_term
 *             - total_annual
 *             - init_credit
 *             - num_shares
 *     responses:
 *       200:
 *         description: Information sent successfully to Salesforce.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información enviada exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.post("/sendFormNewCredit", getToken, (req, res) => {
  const {
    req_type,
    first_name,
    last_name,
    doc_type,
    num_document,
    birthdate,
    genre,
    email,
    phone,
    job,
    salary,
    city,
    address,
    num_policy,
    insurer_place,
    insurer,
    name_broker,
    nit_broker,
    broker,
    plate,
    init_term,
    total_annual,
    init_credit,
    num_shares,
  } = req.body;

  try {
    const body = {
      TipoDesolicitud: req_type,
      Name: first_name,
      Apellido: last_name,
      TipoDocumento: doc_type,
      NoDocumento: num_document,
      FechaNacimiento: birthdate,
      Genero: genre,
      Correo: email,
      Telefono: phone,
      Ocupacion: job,
      IngresosTitular: salary,
      IdCiudadresidencia: city,
      DireccionTitular: address,
      NoPoliza: num_policy,
      Sucursal: insurer_place,
      Aseguradoradelapoliza: insurer,
      NombreIntermediario: name_broker,
      NitIntermediario: nit_broker,
      AsesordelCredito: broker,
      Placa: plate,
      VigenciaInicial: init_term,
      PrimaTotal: total_annual,
      AbonoInicial: init_credit,
      NoCuotas: num_shares,
    };
    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/CreacionCredLead",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

/**
 * @swagger
 * /sendFormRenovation:
 *   post:
 *     summary: Send renovation credit form data to Salesforce.
 *     tags:
 *       - salesforce
 *     description: Sends personal and renovation credit information to Salesforce for processing.
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: The body contains the renovation credit application data.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             req_type:
 *               type: string
 *               description: The type of the request (e.g., credit renewal).
 *             first_name:
 *               type: string
 *               description: The first name of the applicant.
 *             last_name:
 *               type: string
 *               description: The last name of the applicant.
 *             doc_type:
 *               type: string
 *               description: The type of document (e.g., ID, passport).
 *             num_document:
 *               type: string
 *               description: The document number.
 *             num_policy:
 *               type: string
 *               description: The policy number associated with the applicant.
 *             insurer:
 *               type: string
 *               description: The insurer name.
 *             name_broker:
 *               type: string
 *               description: The name of the broker.
 *             nit_broker:
 *               type: string
 *               description: The NIT of the broker.
 *             broker:
 *               type: string
 *               description: The broker responsible for the credit.
 *             plate:
 *               type: string
 *               description: The vehicle plate number, if applicable.
 *             init_term:
 *               type: string
 *               description: The initial term of the credit.
 *             total_annual:
 *               type: number
 *               description: The total annual premium for the credit.
 *             init_credit:
 *               type: number
 *               description: The initial amount of the credit.
 *             num_shares:
 *               type: number
 *               description: The number of shares in the credit agreement.
 *           required:
 *             - req_type
 *             - first_name
 *             - last_name
 *             - doc_type
 *             - num_document
 *             - num_policy
 *             - insurer
 *             - name_broker
 *             - nit_broker
 *             - broker
 *             - plate
 *             - init_term
 *             - total_annual
 *             - init_credit
 *             - num_shares
 *     responses:
 *       200:
 *         description: Information sent successfully to Salesforce.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información enviada exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.post("/sendFormRenovation", getToken, (req, res) => {
  const {
    req_type,
    first_name,
    last_name,
    doc_type,
    num_document,
    num_policy,
    insurer,
    name_broker,
    nit_broker,
    broker,
    plate,
    init_term,
    total_annual,
    init_credit,
    num_shares,
  } = req.body;

  try {
    const body = {
      TipoDesolicitud: req_type,
      Name: first_name,
      Apellido: last_name,
      tipoDocumento: doc_type,
      NoDocumento: num_document,
      NoPoliza: num_policy,
      Aseguradoradelapoliza: insurer,
      NombreIntermediario: name_broker,
      NitIntermediario: nit_broker,
      AsesordelCredito: broker,
      Placa: plate,
      VigenciaInicial: init_term,
      PrimaTotal: total_annual,
      AbonoInicial: init_credit,
      NoCuotas: num_shares,
    };
    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/CreacionCredLead",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

/**
 * @swagger
 * /sendDocument:
 *   post:
 *     summary: Send document data to Salesforce and notify via Google Chat.
 *     tags:
 *       - salesforce
 *     description: Sends personal and document data to Salesforce, including file information, and sends a notification to a Google Chat space.
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: The body contains the document data and associated file information.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             Id:
 *               type: string
 *               description: The unique identifier of the person.
 *             NumeroDoc:
 *               type: string
 *               description: The document number of the person.
 *             Nombres:
 *               type: string
 *               description: The first name of the person.
 *             Apellidos:
 *               type: string
 *               description: The last name of the person.
 *             FechaNacimiento:
 *               type: string
 *               format: date
 *               description: The birthdate of the person.
 *             LugarNacimiento:
 *               type: string
 *               description: The place of birth of the person.
 *             FechaExpedicion:
 *               type: string
 *               format: date
 *               description: The date of issuance of the document.
 *             LugarExpedicion:
 *               type: string
 *               description: The place where the document was issued.
 *             Sexo:
 *               type: string
 *               description: The gender of the person.
 *             fileName:
 *               type: string
 *               description: The name of the document file.
 *             fileBody:
 *               type: string
 *               description: The base64 encoded content of the document file.
 *             fileExtension:
 *               type: string
 *               description: The file extension (e.g., pdf, jpg).
 *           required:
 *             - Id
 *             - NumeroDoc
 *             - Nombres
 *             - Apellidos
 *             - FechaNacimiento
 *             - LugarNacimiento
 *             - FechaExpedicion
 *             - LugarExpedicion
 *             - Sexo
 *             - fileName
 *             - fileBody
 *             - fileExtension
 *     responses:
 *       200:
 *         description: Information sent successfully to Salesforce and Google Chat.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información enviada exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   description: The response data from Salesforce.
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.post("/sendDocument", getToken, (req, res) => {
  const {
    Id,
    NumeroDoc,
    Nombres,
    Apellidos,
    FechaNacimiento,
    LugarNacimiento,
    FechaExpedicion,
    LugarExpedicion,
    Sexo,
    fileName,
    fileBody,
    fileExtension,
  } = req.body;

  try {
    const body = {
      NumeroDoc: NumeroDoc,
      Nombres: Nombres,
      Apellidos: Apellidos,
      FechaNacimiento: FechaNacimiento,
      LugarNacimiento: LugarNacimiento,
      FechaExpedicion: FechaExpedicion,
      LugarExpedicion: LugarExpedicion,
      Sexo: Sexo,
      Id: Id,
      ArchivosDoc: [
        {
          fileName: fileName,
          fileBody: fileBody,
          fileExtension: fileExtension,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/PreCreditoDoc",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      const bodyText = {
        text:
          "Se enviaron los siguientes datos de la cedula" +
          JSON.stringify({
            NumeroDoc: NumeroDoc,
            Nombres: Nombres,
            Apellidos: Apellidos,
            FechaNacimiento: FechaNacimiento,
            LugarNacimiento: LugarNacimiento,
            FechaExpedicion: FechaExpedicion,
            LugarExpedicion: LugarExpedicion,
            Sexo: Sexo,
            Id: Id,
            ArchivosDoc: [
              {
                fileName: fileName,
                fileExtension: fileExtension,
              },
            ],
          }),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(bodyText),
      });

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});
app.post("/sendDocumentDev", getTokenDev, (req, res) => {
  const {
    Id,
    NumeroDoc,
    Nombres,
    Apellidos,
    FechaNacimiento,
    LugarNacimiento,
    FechaExpedicion,
    LugarExpedicion,
    Sexo,
    fileName,
    fileBody,
    fileExtension,
  } = req.body;

  try {
    const body = {
      NumeroDoc: NumeroDoc,
      Nombres: Nombres,
      Apellidos: Apellidos,
      FechaNacimiento: FechaNacimiento,
      LugarNacimiento: LugarNacimiento,
      FechaExpedicion: FechaExpedicion,
      LugarExpedicion: LugarExpedicion,
      Sexo: Sexo,
      Id: Id,
      ArchivosDoc: [
        {
          fileName: fileName,
          fileBody: fileBody,
          fileExtension: fileExtension,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://crediseguro--desarrollo.sandbox.my.salesforce.com/services/apexrest/V1/PreCreditoDoc",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      const bodyText = {
        text:
          "Se enviaron los siguientes datos de la cedula" +
          JSON.stringify({
            NumeroDoc: NumeroDoc,
            Nombres: Nombres,
            Apellidos: Apellidos,
            FechaNacimiento: FechaNacimiento,
            LugarNacimiento: LugarNacimiento,
            FechaExpedicion: FechaExpedicion,
            LugarExpedicion: LugarExpedicion,
            Sexo: Sexo,
            Id: Id,
            ArchivosDoc: [
              {
                fileName: fileName,
                fileExtension: fileExtension,
              },
            ],
          }),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(bodyText),
      });

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

/**
 * @swagger
 * /sendDocPoliza:
 *   post:
 *     summary: Send insurance policy document to Salesforce and notify via Google Chat.
 *     tags:
 *       - salesforce
 *     description: Sends insurance policy document data to Salesforce and sends a notification to a Google Chat space.
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: The body contains the insurance policy document data and associated file information.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             Id:
 *               type: string
 *               description: The unique identifier of the document.
 *             fileName:
 *               type: string
 *               description: The name of the document file.
 *             fileBody:
 *               type: string
 *               description: The base64 encoded content of the document file.
 *             fileExtension:
 *               type: string
 *               description: The file extension (e.g., pdf, jpg).
 *           required:
 *             - Id
 *             - fileName
 *             - fileBody
 *             - fileExtension
 *     responses:
 *       200:
 *         description: Information sent successfully to Salesforce and Google Chat.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información enviada exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   description: The response data from Salesforce.
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */


app.post("/sendDocPoliza", getToken, (req, res) => {
  const { Id, fileName, fileBody, fileExtension } = req.body;

  try {
    const body = {
      Id: Id,
      ArchivosDoc: [
        {
          fileName: fileName,
          fileBody: fileBody,
          fileExtension: fileExtension,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/PreCreditoDocPoliza",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      const bodyText = {
        text:
          "Se envio la siguiente poliza" +
          JSON.stringify({
            Id: Id,
            ArchivosDoc: [
              {
                fileName: fileName,
                fileExtension: fileExtension,
              },
            ],
          }),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(bodyText),
      });

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

app.post("/sendDocPolizaDev", getTokenDev, (req, res) => {
  const { Id, fileName, fileBody, fileExtension } = req.body;

  try {
    const body = {
      Id: Id,
      ArchivosDoc: [
        {
          fileName: fileName,
          fileBody: fileBody,
          fileExtension: fileExtension,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://crediseguro--desarrollo.sandbox.my.salesforce.com/services/apexrest/V1/PreCreditoDocPoliza",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      const bodyText = {
        text:
          "Se envio la siguiente poliza" +
          JSON.stringify({
            Id: Id,
            ArchivosDoc: [
              {
                fileName: fileName,
                fileExtension: fileExtension,
              },
            ],
          }),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(bodyText),
      });

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

/**
 * @swagger
 * /sendPoliza:
 *   post:
 *     summary: Send insurance policy data to Salesforce and notify via Google Chat.
 *     tags:
 *       - salesforce
 *     description: Sends insurance policy data to Salesforce and sends a notification to a Google Chat space with the provided policy details.
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: The body contains the insurance policy data to be sent to Salesforce and used for notification.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             Id:
 *               type: string
 *               description: The unique identifier for the policy.
 *             IdAseguradora:
 *               type: string
 *               description: The insurer's unique identifier.
 *             Cod_Sucursal:
 *               type: string
 *               description: The branch code of the insurer.
 *             Nombre_Sucursal:
 *               type: string
 *               description: The name of the branch.
 *             Poliza_No:
 *               type: string
 *               description: The policy number.
 *             Vigencia_Desde:
 *               type: string
 *               format: date
 *               description: The start date of the policy.
 *             Vigencia_Hasta:
 *               type: string
 *               format: date
 *               description: The end date of the policy.
 *             Producto:
 *               type: string
 *               description: The product related to the policy.
 *             Fecha_Solicitud:
 *               type: string
 *               format: date
 *               description: The request date for the policy.
 *             Tomador:
 *               type: string
 *               description: The policyholder's name.
 *             Direccion_Tomador:
 *               type: string
 *               description: The policyholder's address.
 *             Ciudad_Tomador:
 *               type: string
 *               description: The city of the policyholder.
 *             Doc_Tomador:
 *               type: string
 *               description: The document number of the policyholder.
 *             Telefono_Tomador:
 *               type: string
 *               description: The phone number of the policyholder.
 *             Asegurado:
 *               type: string
 *               description: The insured person's name.
 *             Ciudad_Asegurado:
 *               type: string
 *               description: The insured person's city.
 *             Direccion_Asegurado:
 *               type: string
 *               description: The insured person's address.
 *             Doc_Asegurado:
 *               type: string
 *               description: The document number of the insured person.
 *             Telefono_Asegurado:
 *               type: string
 *               description: The phone number of the insured person.
 *             Ciudad_Beneficiario:
 *               type: string
 *               description: The beneficiary's city.
 *             Direccion_Beneficiario:
 *               type: string
 *               description: The beneficiary's address.
 *             Doc_Beneficiario:
 *               type: string
 *               description: The document number of the beneficiary.
 *             Telefono_Beneficiario:
 *               type: string
 *               description: The phone number of the beneficiary.
 *             Genero_Asegurado:
 *               type: string
 *               description: The gender of the insured person.
 *             Placa:
 *               type: string
 *               description: The vehicle license plate number.
 *             Modelo:
 *               type: string
 *               description: The vehicle model.
 *             Total_Prima:
 *               type: string
 *               description: The total premium amount.
 *             Intermediarios:
 *               type: string
 *               description: The intermediaries involved in the policy.
 *             No_Riesgo:
 *               type: string
 *               description: The risk number associated with the policy.
 *             Email_Tomador:
 *               type: string
 *               description: The policyholder's email address.
 *             Fecha_Nacimiento_Asegurado:
 *               type: string
 *               format: date
 *               description: The insured person's birth date.
 *             Email_Asegurado:
 *               type: string
 *               description: The insured person's email address.
 *             Email_Beneficiario:
 *               type: string
 *               description: The beneficiary's email address.
 *             Clase_de_Vehiculo:
 *               type: string
 *               description: The type of vehicle class.
 *             Ciudad_de_Circulacion:
 *               type: string
 *               description: The city where the vehicle is circulated.
 *             Ramo:
 *               type: string
 *               description: The policy type.
 *             Linea:
 *               type: string
 *               description: The policy line.
 *             Beneficiario:
 *               type: string
 *               description: The beneficiary's name.
 *             No_Certificado:
 *               type: string
 *               description: The certificate number.
 *             Prima_NetaHDI:
 *               type: string
 *               description: The net premium.
 *             Numero_Electronico:
 *               type: string
 *               description: The electronic number of the policy.
 *             Codigo_Agente:
 *               type: string
 *               description: The agent code.
 *             Anexo:
 *               type: string
 *               description: Any annexes related to the policy.
 *             Documento_Poliza:
 *               type: string
 *               description: The policy document file.
 *             tipoVehiculo:
 *               type: string
 *               description: The vehicle type.
 *             oficina:
 *               type: string
 *               description: The office associated with the policy.
 *             rechazoOCR:
 *               type: string
 *               description: A flag indicating rejection of OCR.
 *           required:
 *             - Id
 *             - Poliza_No
 *             - Vigencia_Desde
 *             - Doc_Tomador
 *             - Placa
 *             - Total_Prima
 *     responses:
 *       200:
 *         description: Insurance policy information successfully sent to Salesforce and Google Chat.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información enviada exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   description: The response data from Salesforce.
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.post("/sendPoliza", getToken, (req, res) => {
  const {
    Id,
    IdAseguradora,
    Cod_Sucursal,
    Nombre_Sucursal,
    Poliza_No,
    Vigencia_Desde,
    Vigencia_Hasta,
    Producto,
    Fecha_Solicitud,
    Tomador,
    Direccion_Tomador,
    Ciudad_Tomador,
    Doc_Tomador,
    Telefono_Tomador,
    Asegurado,
    Ciudad_Asegurado,
    Direccion_Asegurado,
    Doc_Asegurado,
    Telefono_Asegurado,
    Ciudad_Beneficiario,
    Direccion_Beneficiario,
    Doc_Beneficiario,
    Telefono_Beneficiario,
    Genero_Asegurado,
    Placa,
    Modelo,
    Total_Prima,
    Intermediarios,
    No_Riesgo,
    Email_Tomador,
    Fecha_Nacimiento_Asegurado,
    Email_Asegurado,
    Email_Beneficiario,
    Clase_de_Vehiculo,
    Ciudad_de_Circulacion,
    Ramo,
    Linea,
    Beneficiario,
    No_Certificado,
    Prima_NetaHDI,
    Numero_Electronico,
    Codigo_Agente,
    Anexo,
    Documento_Poliza,
    tipoVehiculo,
    oficina,
    rechazoOCR,
    costosExpedicionEquidad
  } = req.body;

  try {
    const body = {
      Id: Id, // *
      IdAseguradora: IdAseguradora, // String (aseguradora de la poliza) *  001VF000000xUJpYAM Id Unica aseguradora para pruebas
      Cod_Sucursal: Cod_Sucursal, //String
      Nombre_Sucursal: Nombre_Sucursal, //String
      Poliza_No: Poliza_No, //String *
      Vigencia_Desde: Vigencia_Desde, //Date(DD/MM/YYYY) *
      Vigencia_Hasta: Vigencia_Hasta, //Date(DD/MM/YYYY)
      Producto: Producto, //String
      Fecha_Solicitud: Fecha_Solicitud, //Date(DD/MM/YYYY)
      Tomador: Tomador, //String
      Direccion_Tomador: Direccion_Tomador, //String
      Ciudad_Tomador: Ciudad_Tomador, //String
      Doc_Tomador: Doc_Tomador, //String *
      Telefono_Tomador: Telefono_Tomador, //String
      Asegurado: Asegurado, //String
      Ciudad_ASEGURADO: Ciudad_Asegurado, //String
      Direccion_Asegurado: Direccion_Asegurado, //String
      Doc_Asegurado: Doc_Asegurado, //String
      Telefono_Asegurado: Telefono_Asegurado, //String
      Ciudad_Beneficiario: Ciudad_Beneficiario, //String
      Direccion_Beneficiario: Direccion_Beneficiario, //String
      Doc_Beneficiario: Doc_Beneficiario, //String
      Telefono_Beneficiario: Telefono_Beneficiario, //String
      Genero_Asegurado: Genero_Asegurado, //String
      Placa: Placa, //String *
      Modelo: Modelo, //String
      Total_Prima: Total_Prima, //String no con decimales *
      Intermediarios: Intermediarios, //String
      No_Riesgo: No_Riesgo, //String
      Email_Tomador: Email_Tomador, //String
      Fecha_Nacimiento_Asegurado: null, //Date (DD/MM/YYYY)
      Email_Asegurado: Email_Asegurado, //String
      Email_Beneficiario: Email_Beneficiario, //String
      Clase_de_Vehiculo: Clase_de_Vehiculo, //String
      Ciudad_de_Circulacion: Ciudad_de_Circulacion, //String
      Ramo: Ramo, //String
      Linea: Linea, //String
      Beneficiario: Beneficiario, //String
      No_Certificado: No_Certificado, //String
      Prima_NetaHDI: Prima_NetaHDI,
      Numero_Electronico: Numero_Electronico,
      Codigo_Agente: Codigo_Agente,
      Anexo: Anexo,
      Documento_Poliza: Documento_Poliza,
      tipoVehiculo: tipoVehiculo,
      oficina: oficina,
      rechazoOCR: rechazoOCR,
      costosExpedicionEquidad
    };

    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/PreCreditoPoliza",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      const bodyText = {
        text:
          "Se enviaron los siguientes datos de la poliza : " +
          JSON.stringify(body),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(bodyText),
      });

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data,
      });
    });
  } catch (err) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

app.post("/sendPolizaDev", getTokenDev, (req, res) => {
  const {
    Id,
    IdAseguradora,
    Cod_Sucursal,
    Nombre_Sucursal,
    Poliza_No,
    Vigencia_Desde,
    Vigencia_Hasta,
    Producto,
    Fecha_Solicitud,
    Tomador,
    Direccion_Tomador,
    Ciudad_Tomador,
    Doc_Tomador,
    Telefono_Tomador,
    Asegurado,
    Ciudad_Asegurado,
    Direccion_Asegurado,
    Doc_Asegurado,
    Telefono_Asegurado,
    Ciudad_Beneficiario,
    Direccion_Beneficiario,
    Doc_Beneficiario,
    Telefono_Beneficiario,
    Genero_Asegurado,
    Placa,
    Modelo,
    Total_Prima,
    Intermediarios,
    No_Riesgo,
    Email_Tomador,
    Fecha_Nacimiento_Asegurado,
    Email_Asegurado,
    Email_Beneficiario,
    Clase_de_Vehiculo,
    Ciudad_de_Circulacion,
    Ramo,
    Linea,
    Beneficiario,
    No_Certificado,
    Prima_NetaHDI,
    Numero_Electronico,
    Codigo_Agente,
    Anexo,
    Documento_Poliza,
    tipoVehiculo,
    oficina,
    rechazoOCR,
    costosExpedicionEquidad
  } = req.body;

  try {
    const body = {
      Id: Id, // *
      IdAseguradora: IdAseguradora, // String (aseguradora de la poliza) *  001VF000000xUJpYAM Id Unica aseguradora para pruebas
      Cod_Sucursal: Cod_Sucursal, //String
      Nombre_Sucursal: Nombre_Sucursal, //String
      Poliza_No: Poliza_No, //String *
      Vigencia_Desde: Vigencia_Desde, //Date(DD/MM/YYYY) *
      Vigencia_Hasta: Vigencia_Hasta, //Date(DD/MM/YYYY)
      Producto: Producto, //String
      Fecha_Solicitud: Fecha_Solicitud, //Date(DD/MM/YYYY)
      Tomador: Tomador, //String
      Direccion_Tomador: Direccion_Tomador, //String
      Ciudad_Tomador: Ciudad_Tomador, //String
      Doc_Tomador: Doc_Tomador, //String *
      Telefono_Tomador: Telefono_Tomador, //String
      Asegurado: Asegurado, //String
      Ciudad_ASEGURADO: Ciudad_Asegurado, //String
      Direccion_Asegurado: Direccion_Asegurado, //String
      Doc_Asegurado: Doc_Asegurado, //String
      Telefono_Asegurado: Telefono_Asegurado, //String
      Ciudad_Beneficiario: Ciudad_Beneficiario, //String
      Direccion_Beneficiario: Direccion_Beneficiario, //String
      Doc_Beneficiario: Doc_Beneficiario, //String
      Telefono_Beneficiario: Telefono_Beneficiario, //String
      Genero_Asegurado: Genero_Asegurado, //String
      Placa: Placa, //String *
      Modelo: Modelo, //String
      Total_Prima: Total_Prima, //String no con decimales *
      Intermediarios: Intermediarios, //String
      No_Riesgo: No_Riesgo, //String
      Email_Tomador: Email_Tomador, //String
      Fecha_Nacimiento_Asegurado: null, //Date (DD/MM/YYYY)
      Email_Asegurado: Email_Asegurado, //String
      Email_Beneficiario: Email_Beneficiario, //String
      Clase_de_Vehiculo: Clase_de_Vehiculo, //String
      Ciudad_de_Circulacion: Ciudad_de_Circulacion, //String
      Ramo: Ramo, //String
      Linea: Linea, //String
      Beneficiario: Beneficiario, //String
      No_Certificado: No_Certificado, //String
      Prima_NetaHDI: Prima_NetaHDI,
      Numero_Electronico: Numero_Electronico,
      Codigo_Agente: Codigo_Agente,
      Anexo: Anexo,
      Documento_Poliza: Documento_Poliza,
      tipoVehiculo: tipoVehiculo,
      oficina: oficina,
      rechazoOCR: rechazoOCR,
      costosExpedicionEquidad: costosExpedicionEquidad
    };

    axios({
      method: "POST",
      url: "https://crediseguro--desarrollo.sandbox.my.salesforce.com/services/apexrest/V1/PreCreditoPoliza",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {
      const bodyText = {
        text:
          "Se enviaron los siguientes datos de la poliza : " +
          JSON.stringify(body),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(bodyText),
      });

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data,
      });
    });
  } catch (err) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

/**
 * @swagger
 * /getPoliza/{id}:
 *   get:
 *     summary: Get policy details by ID from Salesforce.
 *     tags:
 *       - salesforce
 *     description: Fetches the details of an insurance policy from Salesforce using the provided policy ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier for the insurance policy.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the policy information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información obtenida exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   description: The policy details fetched from Salesforce.
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */


app.get("/getPoliza/:id", getToken, (req, res) => {
  axios({
    method: "GET",
    url: `https://crediseguro.my.salesforce.com/services/apexrest/V1/Poliza_Front/${req.params.id}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.token}`,
    },
  }).then(({ data }) => {
    res.status(200).json({
      message: "Información obtendida exitosamente",
      status: 200,
      data: data,
    });
  });
});

/**
 * @swagger
 * /getDocument/{document}:
 *   get:
 *     summary: Get client document details with masked email and phone.
 *     tags:
 *       - salesforce
 *     description: Retrieves client information from Salesforce based on the provided document ID, including masking part of the email and phone number for privacy.
 *     parameters:
 *       - in: path
 *         name: document
 *         required: true
 *         description: The document identifier to retrieve client information.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the document information with email and phone masked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información obtenida exitosamente"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     Tipodocumento:
 *                       type: string
 *                       example: "DNI"
 *                     Phone:
 *                       type: string
 *                       example: "12345******67"
 *                     Nombre:
 *                       type: string
 *                       example: "Juan Pérez"
 *                     NoDocumento:
 *                       type: string
 *                       example: "123456789"
 *                     IdCliente:
 *                       type: string
 *                       example: "001VF000000xUJpYAM"
 *                     Email:
 *                       type: string
 *                       example: "juan*****@gmail.com"
 *       404:
 *         description: Client information not found for the given document ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Información no encontrada"
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 data:
 *                   type: string
 *                   example: ""
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.get("/getDocument/:document", getToken, (req, res) => {
  axios({
    method: "GET",
    url: `https://crediseguro.my.salesforce.com/services/apexrest/V1/Info_Client/${req.params.document}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.token}`,
    },
  }).then(({ data }) => {
    
    if (data.IdCliente) {
      const valueEmail = data.Email;
      const valuePhone = data.Phone;
      const chars = 5; // Cantidad de caracters visibles

      const email_masked = valueEmail.replace(
        /([a-z0-9._%-]+)@/gi,
        (match, username) => {
          const visible = username.slice(0, chars);
          const masked = "*".repeat(Math.max(0, username.length - chars));
          return visible + masked + "@";
        }
      );

      const mascaraLongitud = valuePhone.length - 4; // Dejaremos visibles los 2 extremos y ocultaremos el centro

      // Crea la máscara de asteriscos
      const mascara = "*".repeat(mascaraLongitud);

      // Construye el nuevo número con los extremos visibles y el centro oculto
      const phone_masked =
        valuePhone.substring(0, 2) +
        mascara +
        valuePhone.substring(valuePhone.length - 2);

      const daraReturn = {
        Tipodocumento: data.Tipodocumento,
        Phone: phone_masked,
        Nombre: data.Nombre,
        NoDocumento: data.NoDocumento,
        IdCliente: data.IdCliente,
        Email: email_masked,
      };

      res.status(200).json({
        message: "Información obtendida exitosamente",
        status: 200,
        data: daraReturn,
      });
    } else {
      res.status(200).json({
        message: "Información no encontrada",
        status: 200,
        data: "",
      });
    }
  }).catch((error) => {
    console.log(error);
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  });
});

/**
 * @swagger
 * /updateAccountDruo:
 *   post:
 *     tags:
 *       - salesforce
 *     summary: Update the Druo account with bank account details.
 *     description: This endpoint updates the Druo account information in Salesforce by associating a primary reference ID with a bank account UUID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   primary_reference:
 *                     type: string
 *                     example: "123456789"
 *                   uuid:
 *                     type: string
 *                     example: "abcd-1234-efgh-5678"
 *     responses:
 *       200:
 *         description: Successfully updated the account in Salesforce.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account updated successfully."
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */


app.post("/updateAccountDruo", getToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      IdCuenta: data.primary_reference,
      IdCuentaDruo: data.uuid,
    };

    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/AgregarCuentaBancaria",
      data: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
      .then(({ data }) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
});

/**
 * @swagger
 * /updatePaymentDruo:
 *   post:
 *     tags:
 *       - salesforce
 *     summary: Update payment status for Druo account.
 *     description: This endpoint updates the payment status and details for a Druo account in Salesforce, including the reference, status, amount, and code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   primary_reference:
 *                     type: string
 *                     example: "123456789"
 *                   status:
 *                     type: string
 *                     example: "paid"
 *                   amount:
 *                     type: number
 *                     format: float
 *                     example: 150.75
 *                   code:
 *                     type: string
 *                     example: "ABCD1234"
 *     responses:
 *       200:
 *         description: Successfully updated the payment status in Salesforce.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment status updated successfully."
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.post("/updatePaymentDruo", getToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      id_cuota: data.primary_reference,
      status: data.status,
      Valor: data.amount,
      Code: data.code,
    };

    axios({
      method: "POST",
      url: "https://crediseguro.my.salesforce.com/services/apexrest/V1/ValidacionDebito",
      data: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
      .then(({ data }) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
});

/**
 * @swagger
 * /getCavcaReview:
 *   get:
 *     summary: Get reviews and details of a place from Google Maps.
 *     tags:
 *       - general
 *     description: This endpoint retrieves detailed information, including reviews and ratings, of a place using Google Maps API.
 *     responses:
 *       200:
 *         description: Successfully retrieved the place details and reviews.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Cavca"
 *                 rating:
 *                   type: number
 *                   format: float
 *                   example: 4.5
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       author_name:
 *                         type: string
 *                         example: "John Doe"
 *                       rating:
 *                         type: number
 *                         format: float
 *                         example: 5
 *                       text:
 *                         type: string
 *                         example: "Great service and friendly staff!"
 *                       time:
 *                         type: string
 *                         example: "2025-01-20T12:34:56Z"
 *                 user_ratings_total:
 *                   type: integer
 *                   example: 120
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ha ocurrido un problema con el servidor: <error-message>"
 */

app.get("/getCavcaReview", (req, res) => {
  try {
    axios({
      method: "GET",
      url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJa8uS4UGFP44RBeHK_EWwGVs&fields=name,rating,reviews,user_ratings_total&key=AIzaSyCUiIyB5nTdYIi5RPNZjaluo4_BzTyzvtY&reviews_sort=newest&reviews_no_translations=true&translated=false`,
    })
      .then(({ data }) => {
        res.json(data.result);
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (err) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

/**
 /**
 * @swagger
 * /getTemplate:
 *   get:
 *     tags:
 *       - docusign
 *     summary: Get DocuSign templates
 *     description: This endpoint retrieves the list of templates available in the DocuSign account.
 *     security:
 *       - ApiTokenAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of DocuSign templates.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       templateId:
 *                         type: string
 *                         example: "12ab34cd-56ef-78gh-90ij-klmnopqrstuv"
 *                       name:
 *                         type: string
 *                         example: "Insurance Agreement Template"
 *                       description:
 *                         type: string
 *                         example: "A template for signing insurance agreements."
 *       500:
 *         description: Server error or unexpected issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error with the server: <error-message>"
 */

app.get("/getTemplate", verifyToken, async (req, res) => {
  try {
    const tokenDocusign = await createToken("4095dee1-7ed5-4dd9-be1d-c59ce524f7df");

    let dsApiClient = new docusign.ApiClient();

    dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);

    dsApiClient.addDefaultHeader(
      "Authorization",
      "Bearer " + tokenDocusign.access_token
    );

    return new Promise(function (resolve, reject) {
      let templatesApi = new docusign.TemplatesApi(dsApiClient);

      templatesApi
        .listTemplates(process.env.DOCUSIGN_ACCOUNT_ID)
        .then((result) => {
          resolve(result);
          res.json(result);
          return result;
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  } catch (error) {
    throw new Error(error);
  }
});

/**
 * @swagger
 * /sendEnvelope:
 *   post:
 *     summary: Sends a DocuSign envelope for signature
 *     tags: 
 *       - docusign 
 *     description: This endpoint sends an envelope to specified recipients using a template in DocuSign. 
  *     security:
 *       - ApiTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_id:
 *                 type: string
 *                 description: The ID of the DocuSign template to use.
 *                 example: e4496ccc-820a-474a-990e-55051d909744
 *               comprador_uno:
 *                 type: object
 *                 description: Information about the first buyer.
 *                 properties:
 *                   nombre:
 *                     type: string
 *                     description: Name of the first buyer.
 *                   correoElectronico:
 *                     type: string
 *                     description: Email address of the first buyer.
 *                 required:
 *                   - nombre
 *                   - correoElectronico
 *               comprador_dos:
 *                 type: object
 *                 description: Information about the second buyer.
 *                 properties:
 *                   nombre:
 *                     type: string
 *                     description: Name of the second buyer.
 *                   correoElectronico:
 *                     type: string
 *                     description: Email address of the second buyer.
 *                 required:
 *                   - nombre
 *                   - correoElectronico
 *               data:
 *                 type: object
 *                 description: Detailed data about the property and transaction.
 *                 properties:
 *                   nombre_proyecto:
 *                     type: string
 *                     description: Name of the project.
 *                   fidecomiso:
 *                     type: string
 *                     description: Fiduciary entity.
 *                   fecha_escrituracion:
 *                     type: string
 *                     format: date
 *                     description: Deed date.
 *                   comprador_nombre:
 *                     type: string
 *                     description: Name of the buyer.
 *                   comprador_identificacion:
 *                     type: string
 *                     description: Identification number of the buyer.
 *                   comprador_expedicion:
 *                     type: string
 *                     description: Place of issuance of the buyer's ID.
 *                   comprador_estado_civil:
 *                     type: string
 *                     description: Marital status of the buyer.
 *                   comprador_direccion:
 *                     type: string
 *                     description: Address of the buyer.
 *                   comprador_telefono:
 *                     type: string
 *                     description: Phone number of the buyer.
 *                   comprador_email:
 *                     type: string
 *                     format: email
 *                     description: Email address of the buyer.
 *                   agrupacion:
 *                     type: string
 *                     description: Associated grouping information.
 *                   area_privada:
 *                     type: string
 *                     description: Private area of the property.
 *                   valor_inmueble_letras:
 *                     type: string
 *                     description: Property value in words.
 *                   valor_inmueble_numero:
 *                     type: string
 *                     description: Property value in numbers.
 *                   # Include other fields as necessary
 *     responses:
 *       200:
 *         description: Envelope successfully sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *       400:
 *         description: Invalid input.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Server error message.
 */

app.post("/sendEnvelope", verifyToken, async (req, res) => {
  const { template_id, data, comprador_uno, comprador_dos } = req.body;

  const tokenDocusign = await createToken(
    "4095dee1-7ed5-4dd9-be1d-c59ce524f7df"
  );

  let dsApiClient = new docusign.ApiClient();

  dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);

  dsApiClient.addDefaultHeader(
    "Authorization",
    "Bearer " + tokenDocusign.access_token
  );

  try {
    return new Promise(function (resolve, reject) {
      const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

      // Define los destinatarios
      const signer1 = docusign.Signer.constructFromObject({
        email: comprador_uno.correoElectronico, //"nn@nn.com.co",
        name: comprador_uno.nombre, //"nn",
        recipientId: "1",
        roleName: "comprador_1", // Este debe coincidir con el rol definido en tu plantilla
      });

      // const signer2 = docusign.Signer.constructFromObject({
      //   email: comprador_dos.correoElectronico, //"nn@nn.com.co",
      //   name: comprador_dos.nombre, //"nn",
      //   recipientId: "2",
      //   roleName: "comprador_2", // Este debe coincidir con el rol definido en tu plantilla
      // });

      // Define los campos de la plantilla que quieres rellenar

      // formato 6037c31e-9aaa-4327-91a8-6ba346bd2f18
      const nombre_proyecto_1 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_1",
        value: data.nombre_proyecto, //"Seguros Falsos S.A.",
      });

      const fidecomiso_1 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_1",
        value: data.fidecomiso, //"Seguros Falsos S.A.",
      });

      const fecha_escrituracion = docusign.Text.constructFromObject({
        tabLabel: "fecha_escrituracion",
        value: data.fecha_escrituracion,
      });

      const comprador_nombre_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_nombre_1",
        value: data.comprador_nombre,
      });

      const comprador_identificacion_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_identificacion_1",
        value: data.comprador_identificacion,
      });

      const comprador_expedicion_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_expedicion_1",
        value: data.comprador_expedicion,
      });

      const comprador_estado_civil_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_estado_civil_1",
        value: data.comprador_estado_civil,
      });

      const comprador_direccion_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_direccion_1",
        value: data.comprador_direccion,
      });

      const comprador_telefono_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_telefono_1",
        value: data.comprador_telefono,
      });

      const comprador_email_1 = docusign.Text.constructFromObject({
        tabLabel: "comprador_email_1",
        value: data.comprador_email,
      });

      const comprador_nombre_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_nombre_2",
        value: data.comprador_nombre,
      });

      const comprador_identificacion_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_identificacion_2",
        value: data.comprador_identificacion,
      });

      const comprador_expedicion_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_expedicion_2",
        value: data.comprador_expedicion,
      });

      const comprador_estado_civil_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_estado_civil_2",
        value: data.comprador_estado_civil,
      });

      const comprador_direccion_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_direccion_2",
        value: data.comprador_direccion,
      });

      const comprador_telefono_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_telefono_2",
        value: data.comprador_telefono,
      });

      const comprador_email_2 = docusign.Text.constructFromObject({
        tabLabel: "comprador_email_2",
        value: data.comprador_email,
      });

      const agrupacion = docusign.Text.constructFromObject({
        tabLabel: "agrupacion",
        value: data.agrupacion,
      });

      const area_privada = docusign.Text.constructFromObject({
        tabLabel: "area_privada",
        value: data.area_privada,
      });

      const valor_inmueble_letras_1 = docusign.Text.constructFromObject({
        tabLabel: "valor_inmueble_letras_1",
        value: data.valor_inmueble_letras,
      });

      const valor_inmueble_numero = docusign.Text.constructFromObject({
        tabLabel: "valor_inmueble_numero",
        value: data.valor_inmueble_numero,
      });

      const valor_smlv_letras = docusign.Text.constructFromObject({
        tabLabel: "valor_smlv_letras",
        value: data.valor_smlv_letras,
      });

      const valor_smlv_numero = docusign.Text.constructFromObject({
        tabLabel: "valor_smlv_numero",
        value: data.valor_smlv_numero,
      });

      const fiducia = docusign.Text.constructFromObject({
        tabLabel: "fiducia",
        value: data.fiducia,
      });

      const nombre_proyecto_2 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_2",
        value: data.nombre_proyecto,
      });

      const apartamento = docusign.Text.constructFromObject({
        tabLabel: "apartamento",
        value: data.apartamento,
      });

      const torre = docusign.Text.constructFromObject({
        tabLabel: "torre",
        value: data.torre,
      });

      const area_construida_2 = docusign.Text.constructFromObject({
        tabLabel: "area_construida_2",
        value: data.area_construida,
      });

      const area_privada_2 = docusign.Text.constructFromObject({
        tabLabel: "area_privada_2",
        value: data.area_privada,
      });

      const nombre_proyecto_3 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_3",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_4 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_4",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_5 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_5",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_6 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_6",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_7 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_7",
        value: data.nombre_proyecto,
      });

      const smlv_valor = docusign.Text.constructFromObject({
        tabLabel: "smlv_valor",
        value: data.smlv_valor,
      });

      const valor_inmueble_letras_2 = docusign.Text.constructFromObject({
        tabLabel: "valor_inmueble_letras_2",
        value: data.valor_inmueble_letras,
      });

      const valor_inmueble_numero_2 = docusign.Text.constructFromObject({
        tabLabel: "valor_inmueble_numero_2",
        value: data.valor_inmueble_numero,
      });

      const fidecomiso_2 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_2",
        value: data.fidecomiso,
      });

      const fidecomiso_3 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_3",
        value: data.fidecomiso,
      });

      const smlv_escritura = docusign.Text.constructFromObject({
        tabLabel: "smlv_escritura",
        value: data.smlv_escritura,
      });

      const entidad_1 = docusign.Text.constructFromObject({
        tabLabel: "entidad_1",
        value: data.entidad,
      });

      const valor_entidad_1 = docusign.Text.constructFromObject({
        tabLabel: "valor_entidad_1",
        value: data.valor_entidad,
      });

      const valor_entidad_letras_1 = docusign.Text.constructFromObject({
        tabLabel: "valor_entidad_letras_1",
        value: data.valor_entidad_letras,
      });

      const entidad_2 = docusign.Text.constructFromObject({
        tabLabel: "entidad_2",
        value: data.entidad,
      });

      const valor_entidad_2 = docusign.Text.constructFromObject({
        tabLabel: "valor_entidad_2",
        value: data.valor_entidad,
      });

      const valor_entidad_letras_2 = docusign.Text.constructFromObject({
        tabLabel: "valor_entidad_letras_2",
        value: data.valor_entidad_letras,
      });

      const entidad_3 = docusign.Text.constructFromObject({
        tabLabel: "entidad_3",
        value: data.entidad,
      });

      const valor_entidad_3 = docusign.Text.constructFromObject({
        tabLabel: "valor_entidad_3",
        value: data.valor_entidad,
      });

      const valor_entidad_letras_3 = docusign.Text.constructFromObject({
        tabLabel: "valor_entidad_letras_3",
        value: data.valor_entidad_letras,
      });

      const fidecomiso_4 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_4",
        value: data.fidecomiso,
      });

      const fidecomiso_5 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_5",
        value: data.fidecomiso,
      });

      const fidecomiso_6 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_6",
        value: data.fidecomiso,
      });

      const fidecomiso_7 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_7",
        value: data.fidecomiso,
      });

      const fidecomiso_8 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_8",
        value: data.fidecomiso,
      });

      const fidecomiso_9 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_9",
        value: data.fidecomiso,
      });

      const fidecomiso_10 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_10",
        value: data.fidecomiso,
      });

      const nombre_proyecto_8 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_8",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_20 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_20",
        value: data.nombre_proyecto,
      });

      const fidecomiso_11 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_11",
        value: data.fidecomiso,
      });

      const clausula_11 = docusign.Text.constructFromObject({
        tabLabel: "clausula_11",
        value: data.clausula,
      });

      const nombre_proyecto_9 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_9",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_10 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_10",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_11 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_11",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_12 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_12",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_13 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_13",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_14 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_14",
        value: data.nombre_proyecto,
      });

      const fidecomiso_12 = docusign.Text.constructFromObject({
        tabLabel: "fidecomiso_12",
        value: data.fidecomiso,
      });

      const nombre_proyecto_15 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_15",
        value: data.nombre_proyecto,
      });

      const conyuge_nombre = docusign.Text.constructFromObject({
        tabLabel: "conyuge_nombre",
        value: data.conyuge_nombre,
      });

      const conyuge_documento = docusign.Text.constructFromObject({
        tabLabel: "conyuge_documento",
        value: data.conyuge_documento,
      });

      const nombre_proyecto_16 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_16",
        value: data.nombre_proyecto,
      });

      const agrupacion_2 = docusign.Text.constructFromObject({
        tabLabel: "agrupacion_2",
        value: data.agrupacion,
      });

      const comprador_nombre_3 = docusign.Text.constructFromObject({
        tabLabel: "comprador_nombre_3",
        value: data.comprador_nombre,
      });

      const comprador_identificacion_3 = docusign.Text.constructFromObject({
        tabLabel: "comprador_identificacion_3",
        value: data.comprador_identificacion,
      });

      const tipo_venta = docusign.Text.constructFromObject({
        tabLabel: "tipo_venta",
        value: data.tipo_venta,
      });

      const valor_venta = docusign.Text.constructFromObject({
        tabLabel: "valor_venta",
        value: data.valor_venta,
      });

      const subtotal = docusign.Text.constructFromObject({
        tabLabel: "subtotal",
        value: data.subtotal,
      });

      const cancelado_a_fecha = docusign.Text.constructFromObject({
        tabLabel: "cancelado_a_fecha",
        value: data.cancelado_a_fecha,
      });

      const fecha_separacion = docusign.Text.constructFromObject({
        tabLabel: "fecha_separacion",
        value: data.fecha_separacion,
      });

      const valor_separacion = docusign.Text.constructFromObject({
        tabLabel: "valor_separacion",
        value: data.valor_separacion,
      });

      const fecha_cuota = docusign.Text.constructFromObject({
        tabLabel: "fecha_cuota",
        value: data.fecha_cuota,
      });

      const valor_cuota = docusign.Text.constructFromObject({
        tabLabel: "valor_cuota",
        value: data.valor_cuota,
      });

      const fecha_cesantias = docusign.Text.constructFromObject({
        tabLabel: "fecha_cesantias",
        value: data.fecha_cesantias,
      });

      const valor_cesantias = docusign.Text.constructFromObject({
        tabLabel: "valor_cesantias",
        value: data.valor_cesantias,
      });

      const fecha_ahorro_programado = docusign.Text.constructFromObject({
        tabLabel: "fecha_ahorro_programado",
        value: data.fecha_ahorro_programado,
      });

      const valor_ahorro_programado = docusign.Text.constructFromObject({
        tabLabel: "valor_ahorro_programado",
        value: data.valor_ahorro_programado,
      });

      const fecha_pensiones_obligatorias = docusign.Text.constructFromObject({
        tabLabel: "fecha_pensiones_obligatorias",
        value: data.fecha_pensiones_obligatorias,
      });

      const valor_pensiones_obligatorias = docusign.Text.constructFromObject({
        tabLabel: "valor_pensiones_obligatorias",
        value: data.valor_pensiones_obligatorias,
      });

      const fecha_cuenta_afc = docusign.Text.constructFromObject({
        tabLabel: "fecha_cuenta_afc",
        value: data.fecha_cuenta_afc,
      });

      const valor_cuenta_afc = docusign.Text.constructFromObject({
        tabLabel: "valor_cuenta_afc",
        value: data.valor_cuenta_afc,
      });

      const fecha_abono_cuota_inicial = docusign.Text.constructFromObject({
        tabLabel: "fecha_abono_cuota_inicial",
        value: data.fecha_abono_cuota_inicial,
      });

      const valor_bono_cuota_inicial = docusign.Text.constructFromObject({
        tabLabel: "valor_bono_cuota_inicial",
        value: data.valor_bono_cuota_inicial,
      });

      const fecha_subsidio = docusign.Text.constructFromObject({
        tabLabel: "fecha_subsidio",
        value: data.fecha_subsidio,
      });

      const valor_subsidio = docusign.Text.constructFromObject({
        tabLabel: "valor_subsidio",
        value: data.valor_subsidio,
      });

      const fecha_subsidio_concurrente = docusign.Text.constructFromObject({
        tabLabel: "fecha_subsidio_concurrente",
        value: data.fecha_subsidio_concurrente,
      });

      const valor_subsidio_concurrente = docusign.Text.constructFromObject({
        tabLabel: "valor_subsidio_concurrente",
        value: data.valor_subsidio_concurrente,
      });

      const fecha_subsidio_habitat = docusign.Text.constructFromObject({
        tabLabel: "fecha_subsidio_habitat",
        value: data.fecha_subsidio_habitat,
      });

      const valor_subsidio_habitat = docusign.Text.constructFromObject({
        tabLabel: "valor_subsidio_habitat",
        value: data.valor_subsidio_habitat,
      });

      const fecha_credito = docusign.Text.constructFromObject({
        tabLabel: "fecha_credito",
        value: data.fecha_credito,
      });

      const valor_credito = docusign.Text.constructFromObject({
        tabLabel: "valor_credito",
        value: data.valor_credito,
      });

      const valor_total = docusign.Text.constructFromObject({
        tabLabel: "valor_total",
        value: data.valor_total,
      });

      const nombre_proyecto_17 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_17",
        value: data.nombre_proyecto,
      });

      const agrupacion_3 = docusign.Text.constructFromObject({
        tabLabel: "agrupacion_3",
        value: data.agrupacion,
      });

      const comprador_nombre_4 = docusign.Text.constructFromObject({
        tabLabel: "comprador_nombre_4",
        value: data.comprador_nombre,
      });

      const comprador_identificacion_4 = docusign.Text.constructFromObject({
        tabLabel: "comprador_identificacion_4",
        value: data.comprador_identificacion,
      });

      const tipo_inmueble = docusign.Text.constructFromObject({
        tabLabel: "tipo_inmueble",
        value: data.tipo_inmueble,
      });

      const nombre_proyecto_18 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_18",
        value: data.nombre_proyecto,
      });

      const nombre_proyecto_19 = docusign.Text.constructFromObject({
        tabLabel: "nombre_proyecto_19",
        value: data.nombre_proyecto,
      });

      const area_construida_total = docusign.Text.constructFromObject({
        tabLabel: "area_construida_total",
        value: data.area_construida_total,
      });      

      signer1.tabs = docusign.Tabs.constructFromObject({
        textTabs: [
          nombre_proyecto_1,
          fidecomiso_1,
          fecha_escrituracion,
          comprador_nombre_1,
          comprador_identificacion_1,
          comprador_expedicion_1,
          comprador_estado_civil_1,
          comprador_direccion_1,
          comprador_telefono_1,
          comprador_email_1,
          comprador_nombre_2,
          comprador_identificacion_2,
          comprador_expedicion_2,
          comprador_estado_civil_2,
          comprador_direccion_2,
          comprador_telefono_2,
          comprador_email_2,
          agrupacion,
          area_privada,
          valor_inmueble_letras_1,
          valor_inmueble_numero,
          valor_smlv_letras,
          valor_smlv_numero,
          fiducia,
          nombre_proyecto_2,
          apartamento,
          torre,
          area_construida_2,
          area_privada_2,
          nombre_proyecto_3,
          nombre_proyecto_4,
          nombre_proyecto_5,
          nombre_proyecto_6,
          nombre_proyecto_7,
          smlv_valor,
          valor_inmueble_letras_2,
          valor_inmueble_numero_2,
          fidecomiso_2,
          fidecomiso_3,
          smlv_escritura,
          entidad_1,
          valor_entidad_1,
          valor_entidad_letras_1,
          entidad_2,
          valor_entidad_2,
          valor_entidad_letras_2,
          entidad_3,
          valor_entidad_3,
          valor_entidad_letras_3,
          fidecomiso_4,
          fidecomiso_5,
          fidecomiso_6,
          fidecomiso_7,
          fidecomiso_8,
          fidecomiso_9,
          fidecomiso_10,
          nombre_proyecto_8,
          nombre_proyecto_20,
          fidecomiso_11,
          clausula_11,
          nombre_proyecto_9,
          nombre_proyecto_10,
          nombre_proyecto_11,
          nombre_proyecto_12,
          nombre_proyecto_13,
          nombre_proyecto_14,
          fidecomiso_12,
          nombre_proyecto_15,
          conyuge_nombre,
          conyuge_documento,
          nombre_proyecto_16,
          agrupacion_2,
          comprador_nombre_3,
          comprador_identificacion_3,
          tipo_venta,
          valor_venta,
          subtotal,
          cancelado_a_fecha,
          fecha_separacion,
          valor_separacion,
          fecha_cuota,
          valor_cuota,
          fecha_cesantias,
          valor_cesantias,
          fecha_ahorro_programado,
          valor_ahorro_programado,
          fecha_pensiones_obligatorias,
          valor_pensiones_obligatorias,
          fecha_cuenta_afc,
          valor_cuenta_afc,
          fecha_abono_cuota_inicial,
          valor_bono_cuota_inicial,
          fecha_subsidio,
          valor_subsidio,
          fecha_subsidio_concurrente,
          valor_subsidio_concurrente,
          fecha_subsidio_habitat,
          valor_subsidio_habitat,
          fecha_credito,
          valor_credito,
          valor_total,
          nombre_proyecto_17,
          agrupacion_3,
          comprador_nombre_4,
          comprador_identificacion_4,
          tipo_inmueble,
          nombre_proyecto_18,
          nombre_proyecto_19,
          area_construida_total,
        ],
      });

    const envelopeDefinition = new docusign.EnvelopeDefinition();
      envelopeDefinition.templateId = template_id;
      envelopeDefinition.templateRoles = [signer1];
      envelopeDefinition.status = "sent";

      // Enviar el sobre
      envelopesApi
        .createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
          envelopeDefinition,
        })
        .then((result) => {
          resolve(result);
          res.json(result);
          return result;
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  } catch (error) {
    throw new Error(error);
  }
});

/**
 * @swagger
 * /createCredit:
 *  tags:
 *   post:
 *     summary: Creates a credit request in Salesforce
 *     tags: 
 *       - Salesforce
 *     description: Endpoint to create a credit request and send it to Salesforce.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   tipo_cuenta:
 *                     type: string
 *                     description: Account type (e.g., personal or business).
 *                   cuenta:
 *                     type: object
 *                     description: Personal account information.
 *                     properties:
 *                       nombre:
 *                         type: string
 *                         description: Account holder's first name.
 *                       segundo_nombre:
 *                         type: string
 *                         description: Account holder's middle name.
 *                       apellidos:
 *                         type: string
 *                         description: Account holder's last name.
 *                       genero:
 *                         type: string
 *                         description: Account holder's gender (e.g., Male or Female).
 *                       tipo_documento:
 *                         type: string
 *                         description: Type of identification document.
 *                       celular:
 *                         type: string
 *                         description: Account holder's mobile number.
 *                       numero_documento:
 *                         type: string
 *                         description: Identification document number.
 *                       fecha_nacimiento:
 *                         type: string
 *                         format: date
 *                         description: Account holder's date of birth.
 *                       fecha_expedicion:
 *                         type: string
 *                         format: date
 *                         description: Document issue date.
 *                       correo_electronico:
 *                         type: string
 *                         format: email
 *                         description: Account holder's email address.
 *                       ocupacion:
 *                         type: string
 *                         description: Account holder's occupation.
 *                       ingresos_mensuales:
 *                         type: number
 *                         format: float
 *                         description: Monthly income of the account holder.
 *                       ciudad_nacimiento:
 *                         type: string
 *                         description: City of birth.
 *                   juridicos:
 *                     type: object
 *                     description: Business account information.
 *                     properties:
 *                       nombre_corto:
 *                         type: string
 *                         description: Short name of the business entity.
 *                       no_documento_rep_legal:
 *                         type: string
 *                         description: Legal representative's identification number.
 *                       nit:
 *                         type: string
 *                         description: Tax identification number.
 *                       tipo_persona_juridica:
 *                         type: string
 *                         description: Type of legal entity.
 *                       total_activos:
 *                         type: number
 *                         format: float
 *                         description: Total assets of the entity.
 *                       total_pasivos:
 *                         type: number
 *                         format: float
 *                         description: Total liabilities of the entity.
 *                   credito:
 *                     type: object
 *                     description: Credit details.
 *                     properties:
 *                       id_tipo_credito:
 *                         type: string
 *                         description: Credit type identifier.
 *                       tipo_asegurado:
 *                         type: string
 *                         description: Insured type.
 *                       persona_juridica:
 *                         type: boolean
 *                         description: Indicates if it applies to a legal entity.
 *                       plazo_meses:
 *                         type: number
 *                         description: Credit term in months.
 *                       prima_total:
 *                         type: number
 *                         format: float
 *                         description: Total premium for the credit.
 *                       abono_inicial:
 *                         type: number
 *                         format: float
 *                         description: Initial deposit for the credit.
 *                       linea:
 *                         type: string
 *                         description: Credit line.
 *                       aplica_retefuente:
 *                         type: boolean
 *                         description: Indicates if withholding tax applies.
 *                       no_aplica_retefuente:
 *                         type: boolean
 *                         description: Indicates if withholding tax does not apply.
 *                       placa_vehiculo:
 *                         type: string
 *                         description: Vehicle license plate.
 *                       no_poliza:
 *                         type: string
 *                         description: Policy number.
 *                       anexo:
 *                         type: string
 *                         description: Additional information about the credit.
 *                       sucursal:
 *                         type: string
 *                         description: Branch associated with the credit.
 *                       tipo_amortizacion:
 *                         type: string
 *                         description: Credit amortization type.
 *     responses:
 *       200:
 *         description: Request processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Salesforce service response.
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */

app.post("/createCredit", getTokenDev, verifyToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      Tipo_De_Cuenta: data.tipo_cuenta,
      cuenta: [
        {
          Nombre: data.cuenta.nombre,
          Segundo_nombre: data.cuenta.segundo_nombre,
          Apellidos: data.cuenta.apellidos,
          Genero: data.cuenta.genero,
          Tipo_Documento: data.cuenta.tipo_documento,
          Celular: data.cuenta.celular,
          No_Documento: data.cuenta.numero_documento,
          Fecha_Nacimiento: data.cuenta.fecha_nacimiento,
          Fecha_Expedicion: data.cuenta.fecha_expedicion,
          Correo_electronico: data.cuenta.correo_electronico,
          Ocupacion: data.cuenta.ocupacion,
          Ingresos_Mensuales: data.cuenta.ingresos_mensuales,
          Ciudad_de_Nacimiento: data.cuenta.ciudad_nacimiento,
        },
      ],
      juridicos: [
        {
          Nombre_Corto: data.juridicos.nombre_corto,
          No_Documento_RepLegal: data.juridicos.no_documento_rep_legal,
          NIT: data.juridicos.nit,
          Tipo_de_Persona_Jurídica: data.juridicos.tipo_persona_juridica,
          Total_Activos: data.juridicos.total_activos,
          Total_Pasivos: data.juridicos.total_pasivos,
        },
      ],
      credito: [
        {
          Id_Tipo_Credito: data.credito.id_tipo_credito,
          //Tipo_de_Poliza: data.credito.tipo_de_poliza,
          Tipo_Asegurado: data.credito.tipo_asegurado,
          Persona_Juridica: data.credito.persona_juridica,
          //"Estado": data.credito.estado,
          Plazo_meses: data.credito.plazo_meses,
          Prima_Total: data.credito.prima_total,
          Abono_Inicial: data.credito.abono_inicial,
          Linea: data.credito.linea,
          Si_Aplica_Retefuente: data.credito.aplica_retefuente,
          No_Aplica_Retefuente: data.credito.no_aplica_retefuente,
          Placa_Vehiculo: data.credito.placa_vehiculo,
          No_Poliza: data.credito.no_poliza,
          Anexo: data.credito.anexo,
          Sucursal: data.credito.sucursal,
          //"Intermediario": data.credito.intermediario,
          //"Asesor_Comercial_Intermediario": data.credito.asesor_comercial_intermediario,
          //"Oneroso": data.credito.oneroso,
          //"Tasa_Mensual_Credito": data.credito.tasa_mensual_credito,
          //"Tasa_Mora_Diaria": data.credito.tasa_mora_diaria,
          Tipo_Amortizacion: data.credito.tipo_amortizacion,
          //"Vig_Inicial_Seguro": data.credito.vig_inicial_seguro,
          //"Porcentaje_Intermediario" : data.credito.porcentaje_intermediario,
        },
      ],
    };


    axios({
      method: "POST",
      url: "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/CrearCredMapfre/",
      data: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
    .then(({ data }) => {
      res.json(data);
    })
    .catch((err) => {
      res.status(500).json({
        error: `Ha ocurrido un problema con el servidor: ${err}`,
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
});


// actualizacion de cotizador para cavca
/**
 * @swagger
 * /updateOppCavca:
 *   post:
 *     summary: Updates opportunity data in Salesforce
 *     tags: 
 *       - salesforce
 *     description: Endpoint to update opportunity data in Salesforce for the CAVCA system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   cedula:
 *                     type: string
 *                     description: User's identification document number.
 *                   placa:
 *                     type: string
 *                     description: Vehicle license plate.
 *                   IdCotizacion:
 *                     type: string
 *                     description: Quotation ID.
 *                   ListaDatos:
 *                     type: array
 *                     description: List of insurance-related data.
 *                     items:
 *                       type: object
 *                       properties:
 *                         Bolivar_Premium:
 *                           type: number
 *                           format: float
 *                           description: Premium for Bolivar insurance.
 *                         HDI_Livianos_Full:
 *                           type: number
 *                           format: float
 *                           description: Full coverage for HDI lightweight vehicles.
 *                         Bolivar_Estandar:
 *                           type: number
 *                           format: float
 *                           description: Standard coverage for Bolivar insurance.
 *                         AXAPlusAsis_Plus:
 *                           type: number
 *                           format: float
 *                           description: Plus coverage for AXA assistance.
 *                         Bolivar_Clasico:
 *                           type: number
 *                           format: float
 *                           description: Classic coverage for Bolivar insurance.
 *                         Mapfre_TrebolBasico:
 *                           type: number
 *                           format: float
 *                           description: Basic Trebol plan from Mapfre.
 *                         Liberty_Silver1_VehiculoSustituto:
 *                           type: number
 *                           format: float
 *                           description: Liberty Silver 1 with substitute vehicle option.
 *                         Zurich_Basico:
 *                           type: number
 *                           format: float
 *                           description: Basic coverage for Zurich insurance.
 *                         Solidaria_Premium:
 *                           type: number
 *                           format: float
 *                           description: Premium plan for Solidaria insurance.
 *                         Previsora_Full:
 *                           type: number
 *                           format: float
 *                           description: Full coverage for Previsora insurance.
 *                         Seg_Estado_Inv_Cavca:
 *                           type: number
 *                           format: float
 *                           description: State investment coverage for CAVCA.
 *                         AXA_Vip_asis_esencial:
 *                           type: number
 *                           format: float
 *                           description: VIP essential assistance from AXA.
 *                         # Add other fields as needed
 *     responses:
 *       200:
 *         description: Request processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Salesforce service response.
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */

app.post("/updateOppCavca", getTokenCavca, verifyToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      cedula: data.cedula,
      placa: data.placa,
      ListaDatos: [
        {
          IdCotizacion: data.IdCotizacion,
          Bolivar_Premium: data.Bolivar_Premium,
          HDI_Livianos_Full: data.HDI_Livianos_Full,
          Bolivar_Estandar: data.Bolivar_Estandar,
          AXAPlusAsis_Plus: data.AXAPlusAsis_Plus,
          Bolivar_Clasico: data.Bolivar_Clasico,
          AXAPlusAsis_VIP: data.AXAPlusAsis_VIP,
          SBS_OtrasCiudades: data.SBS_OtrasCiudades,
          Mapfre_ParaLaMujer: data.Mapfre_ParaLaMujer,
          SBS_Full: data.SBS_Full,
          Mapfre_SuperTrebol: data.Mapfre_SuperTrebol,
          SBS_Estandar: data.SBS_Estandar,
          Mapfre_TrebolBasico: data.Mapfre_TrebolBasico,
          Equidad_AutoPlusFull_Elite: data.Equidad_AutoPlusFull_Elite,
          Liberty_Premium_ConVidrios: data.Liberty_Premium_ConVidrios,
          Sura_Global: data.Sura_Global,
          Liberty_Premium: data.Liberty_Premium,
          Sura_Clasico: data.Sura_Clasico,
          Liberty_Integral: data.Liberty_Integral,
          Zurich_Full: data.Zurich_Full,
          Liberty_Silver2_VehiculoSustituto:
            data.Liberty_Silver2_VehiculoSustituto,
          Zurich_Basico: data.Zurich_Basico,
          Liberty_Silver1_VehiculoSustituto:
            data.Liberty_Silver1_VehiculoSustituto,
          Solidaria_Elite: data.Solidaria_Elite,
          Liberty_Basico_PT: data.Liberty_Basico_PT,
          Solidaria_Premium: data.Solidaria_Premium,
          Liberty_Bronze1: data.Liberty_Bronze1,
          Solidaria_Plus: data.Solidaria_Plus,
          Previsora_Full: data.Previsora_Full,
          Previsora_Estandar: data.Previsora_Estandar,
          Seg_Estado_Inv_Cavca: data.Seg_Estado_Inv_Cavca,
          AXA_Vip_asis_esencial: data.AXA_Vip_asis_esencial,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://cavca.my.salesforce.com/services/apexrest/V1/UpdateOpp",
      data: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
      .then(({ data }) => {
        res.json(data);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor a: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor b: ${error}`,
    });
  }
});

app.post("/updateOppCavcaDev", getTokenDevCavca, verifyToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      cedula: data.cedula,
      placa: data.placa,
      Bolivar_Premium: [
        {
          Bolivar_Premium_nCotizacion: data.Bolivar_Premium_nCotizacion,
          Bolivar_Premium_value: data.Bolivar_Premium_value,
        },
      ],
      HDI_Livianos_Full: [
        {
          HDI_Livianos_Full_nCotizacion: data.HDI_Livianos_Full_nCotizacion,
          HDI_Livianos_Full_value: data.HDI_Livianos_Full_value,
        },
      ],
      AXAPlusAsis_Plus: [
        {
          AXAPlusAsis_Plus_nCotizacion: data.AXAPlusAsis_Plus_nCotizacion,
          AXAPlusAsis_Plus_value: data.AXAPlusAsis_Plus_value,
        },
      ],
      Bolivar_Estandar: [
        {
          Bolivar_Estandar_nCotizacion: data.Bolivar_Estandar_nCotizacion,
          Bolivar_Estandar_value: data.Bolivar_Estandar_value,
        },
      ],
      AXAPlusAsis_VIP: [
        {
          AXAPlusAsis_VIP_nCotizacion: data.AXAPlusAsis_VIP_nCotizacion,
          AXAPlusAsis_VIP_value: data.AXAPlusAsis_VIP_value,
        },
      ],
      Bolivar_Clasico: [
        {
          Bolivar_Clasico_nCotizacion: data.Bolivar_Clasico_nCotizacion,
          Bolivar_Clasico_value: data.Bolivar_Clasico_value,
        },
      ],
      AXA_Vip_asis_esencial: [
        {
          AXA_Vip_asis_esencial_nCotizacion:
            data.AXA_Vip_asis_esencial_nCotizacion,
          AXA_Vip_asis_esencial_value: data.AXA_Vip_asis_esencial_value,
        },
      ],
      SBS_OtrasCiudades: [
        {
          SBS_OtrasCiudades_nCotizacion: data.SBS_OtrasCiudades_nCotizacion,
          SBS_OtrasCiudades_value: data.SBS_OtrasCiudades_value,
        },
      ],
      Mapfre_ParaLaMujer: [
        {
          Mapfre_ParaLaMujer_nCotizacion: data.Mapfre_ParaLaMujer_nCotizacion,
          Mapfre_ParaLaMujer_value: data.Mapfre_ParaLaMujer_value,
        },
      ],
      Mapfre_SuperTrebol: [
        {
          Mapfre_SuperTrebol_nCotizacion: data.Mapfre_SuperTrebol_nCotizacion,
          Mapfre_SuperTrebol_value: data.Mapfre_SuperTrebol_value,
        },
      ],
      SBS_Full: [
        {
          SBS_Full_nCotizacion: data.SBS_Full_nCotizacion,
          SBS_Full_value: data.SBS_Full_value,
        },
      ],
      SBS_Estandar: [
        {
          SBS_Estandar_nCotizacion: data.SBS_Estandar_nCotizacion,
          SBS_Estandar_value: data.SBS_Estandar_value,
        },
      ],
      Mapfre_TrebolBasico: [
        {
          Mapfre_TrebolBasico_nCotizacion: data.Mapfre_TrebolBasico_nCotizacion,
          Mapfre_TrebolBasico_value: data.Mapfre_TrebolBasico_value,
        },
      ],
      Equidad_AutoPlusFull_Elite: [
        {
          Equidad_AutoPlusFull_Elite_nCotizacion:
            data.Equidad_AutoPlusFull_Elite_nCotizacion,
          Equidad_AutoPlusFull_Elite_value:
            data.Equidad_AutoPlusFull_Elite_value,
        },
      ],
      Liberty_Premium_ConVidrios: [
        {
          Liberty_Premium_ConVidrios_nCotizacion:
            data.Liberty_Premium_ConVidrios_nCotizacion,
          Liberty_Premium_ConVidrios_value:
            data.Liberty_Premium_ConVidrios_value,
        },
      ],
      Sura_Global: [
        {
          Sura_Global_nCotizacion: data.Sura_Global_nCotizacion,
          Sura_Global_value: data.Sura_Global_value,
        },
      ],
      Liberty_Premium: [
        {
          Liberty_Premium_nCotizacion: data.Liberty_Premium_nCotizacion,
          Liberty_Premium_value: data.Liberty_Premium_value,
        },
      ],
      Sura_Clasico: [
        {
          Sura_Clasico_nCotizacion: data.Sura_Clasico_nCotizacion,
          Sura_Clasico_value: data.Sura_Clasico_value,
        },
      ],
      Liberty_Integral: [
        {
          Liberty_Integral_nCotizacion: data.Liberty_Integral_nCotizacion,
          Liberty_Integral_value: data.Liberty_Integral_value,
        },
      ],
      Zurich_Full: [
        {
          Zurich_Full_nCotizacion: data.Zurich_Full_nCotizacion,
          Zurich_Full_value: data.Zurich_Full_value,
        },
      ],
      Liberty_Silver2_VehiculoSustituto: [
        {
          Liberty_Silver2_VehiculoSustituto_nCotizacion:
            data.Liberty_Silver2_VehiculoSustituto_nCotizacion,
          Liberty_Silver2_VehiculoSustituto_value:
            data.Liberty_Silver2_VehiculoSustituto_value,
        },
      ],
      Zurich_Basico: [
        {
          Zurich_Basico_nCotizacion: data.Zurich_Basico_nCotizacion,
          Zurich_Basico_value: data.Zurich_Basico_value,
        },
      ],
      Liberty_Silver1_VehiculoSustituto: [
        {
          Liberty_Silver1_VehiculoSustituto_nCotizacion:
            data.Liberty_Silver1_VehiculoSustituto_nCotizacion,
          Liberty_Silver1_VehiculoSustituto_value:
            data.Liberty_Silver1_VehiculoSustituto_value,
        },
      ],
      Solidaria_Elite: [
        {
          Solidaria_Elite_nCotizacion: data.Solidaria_Elite_nCotizacion,
          Solidaria_Elite_value: data.Solidaria_Elite_value,
        },
      ],
      Liberty_Basico_PT: [
        {
          Liberty_Basico_PT_nCotizacion: data.Liberty_Basico_PT_nCotizacion,
          Liberty_Basico_PT_value: data.Liberty_Basico_PT_value,
        },
      ],
      Solidaria_Premium: [
        {
          Solidaria_Premium_nCotizacion: data.Solidaria_Premium_nCotizacion,
          Solidaria_Premium_value: data.Solidaria_Premium_value,
        },
      ],
      Liberty_Bronze1: [
        {
          Liberty_Bronze1_nCotizacion: data.Liberty_Bronze1_nCotizacion,
          Liberty_Bronze1_value: data.Liberty_Bronze1_value,
        },
      ],
      Solidaria_Plus: [
        {
          Solidaria_Plus_nCotizacion: data.Solidaria_Plus_nCotizacion,
          Solidaria_Plus_value: data.Solidaria_Plus_value,
        },
      ],
      Previsora_Full: [
        {
          Previsora_Full_nCotizacion: data.Previsora_Full_nCotizacion,
          Previsora_Full_value: data.Previsora_Full_value,
        },
      ],
      Previsora_Estandar: [
        {
          Previsora_Estandar_nCotizacion: data.Previsora_Estandar_nCotizacion,
          Previsora_Estandar_value: data.Previsora_Estandar_value,
        },
      ],
      Seg_Estado_Inv_Cavca: [
        {
          Seg_Estado_Inv_Cavca_nCotizacion:
            data.Seg_Estado_Inv_Cavca_nCotizacion,
          Seg_Estado_Inv_Cavca_value: data.Seg_Estado_Inv_Cavca_value,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://cavca--preproducc.sandbox.my.salesforce.com/services/apexrest/V1/UpdateOpp",
      data: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
      .then(({ data }) => {
        res.json(data);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor a: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor b: ${error}`,
    });
  }
});


// puentes de conexion entre salesforce cvavca y crediseguro, ambiente sandbox y produccion
app.post("/bridge_connection_crediseguro", verifyToken, getToken,  (req, res) => {

  // Lógica según el evento recibido
  if (req.body.event) {
      axios({
        method: "POST",
        url:"https://crediseguro.my.salesforce.com/services/apexrest/V1/" +
          req.body.event,
        data: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.token}`,
        },
      })
        .then(({ data }) => {
          res.json(data);
          res
            .status(200)
            .json({ message: "Webhook recibido correctamente", data: data });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error: `Ha ocurrido un problema con el servidor: ${err}`,
          });
        });
  }

});

app.post("/bridge_connection_cavca", verifyToken, getTokenCavca , (req, res) => {

  console.log(req.body);
    // Lógica según el evento recibido
    if (req.body.event) {
      axios({
        method: "POST",
        url:
          "https://cavca.my.salesforce.com/services/apexrest/V1/" +
          req.body.event,
        data: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.token}`,
        },
      })
        .then(({ data }) => {
          res.status(200).json({ message: "Webhook recibido correctamente", data: data });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error: `Ha ocurrido un problema con el servidor: ${err}`,
          });
        });
    }
    
  }
);

app.post("/bridge_connection_crediseguro_dev",verifyToken,getTokenDev,(req, res) => {
    // Lógica según el evento recibido
    if (req.body.event) {
      axios({
        method: "POST",
        url:
          "https://crediseguro--desarrollo.my.salesforce.com/services/apexrest/V1/" +
          req.body.event,
        data: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.token}`,
        },
      })
        .then(({ data }) => {
          res.json(data);
          res
            .status(200)
            .json({ message: "Webhook recibido correctamente", data: data });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error: `Ha ocurrido un problema con el servidor: ${err}`,
          });
        });
    }
  }
);

app.post("/bridge_connection_cavca_dev", verifyToken, getTokenDevCavca, (req, res) => {
  console.log(req.body);
  // Lógica según el evento recibido
  if (req.body.event) {
    axios({
      method: "POST",
      url:
        "https://cavca--preproducc.sandbox.my.salesforce.com/services/apexrest/V1/" +
        req.body.event,
      data: JSON.stringify(req.body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    })
      .then(({ data }) => {
        res
          .status(200)
          .json({ message: "Webhook recibido correctamente", data: data });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  }
});

// treble bot crediseguro (webhook)
app.post("/treble", (req, res) => {
  console.log(req.query.event);
  console.log(req.body);

  switch (req.query.event) {
    case "autentication":
      res.status(200).json(treble.autentication(req.body));
      break;
    case "dataFormBasic":
      res.status(200).json(treble.validate(req.body));
      break;
    case "uploadDocument":
      res.status(200).json(treble.uploadDocument(req.body));
      break;
    case "uploadPolicy":
      res.status(200).json(treble.uploadPolicy(req.body));
      break;
    case "uploadExhibit":
      res.status(200).json(treble.uploadExhibit(req.body));
      break;
    case "getData":
      res.status(200).json(treble.getData(req.body));
      break;
    case "updateData":
      res.status(200).json(treble.updateData(req.body));
      break;
    case "getCertificate":
      res.status(200).json(treble.getCertificate(req.body));
      break;
    case "downloadCertificate":
      res.status(200).json(treble.downloadCertificate(req.body));
      break;
    case "urlPortal":
      res.status(200).json(treble.urlPortal(req.body));
      break;
    default:
      res.status(400).json({ error: "Evento no reconocido" });
      return;
  }

});

app.post("/treble_client", getToken, (req, res) => {
  console.log(req.query.event);
  console.log(req.body);

  switch (req.query.event) {
    case "validate":
      res.status(200).json(trebleClient.validate(req.token, req.body));
      break;
    case "credit":
      res.status(200).json(trebleClient.credit(req.token, req.body, req.query.status));
      break;
    case "creditRenovation":
      res.status(200).json(trebleClient.creditRenovation(req.token, req.body));
      break;
    case "certificate":
      res.status(200).json(trebleClient.certificate(req.token, req.body, req.query.type));
      break;
    case "video_tutorial":
      res.status(200).json(trebleClient.video_tutorial(req.body));
      break;
    case "createCase":
      res.status(200).json(trebleClient.createCase(req.token, req.body));
      break;
    case "createPac":
      res.status(200).json(trebleClient.createPac(req.token, req.body));
      break;
    case "survey":
      res.status(200).json(trebleClient.survey(req.token, req.body));
      break;
    default:
      res.status(400).json({ error: "Evento no reconocido" });
      return;
  }
});

// equidad

function getTokenEquidad(req, res, next) {
  try {
    axios({
      method: "POST",
      url: "https://servicios.laequidadseguros.coop/api-recaudo/v1/autenticated?username=CREDISEG&password=CrediSeg2025.",
    })
      .then(({ data }) => {
        req.token = data;
        next();
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
}

app.get("/cartera/:param1/:param2/:param3/:param4", getTokenEquidad, (req, res) => {

  axios({
    method: "GET",
    url: `https://servicios.laequidadseguros.coop/api-recaudo/v1/cartera-individual/?param1=${req.params.param1}&param2=${req.params.param2}&param3=${req.params.param3}&param4=${req.params.param4}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: req.token,
    },
  })
    .then(({ data }) => {
      res.status(200).json({
        message: "Información obtendida exitosamente",
        status: 200,
        data: data,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: `Ha ocurrido un problema con el servidor: ${err}`,
      });
    });
});

app.post("/recaudo", getTokenEquidad, (req, res) => {

  let url = `https://servicios.laequidadseguros.coop/api-recaudo/v1/recaudo/?param1=${req.query.param1}&param2=${req.query.param2}&param3=${req.query.param3}&param4=${req.query.param4}&param5=${req.query.param5}`;
  
  console.log("url");
  console.log(url);

  axios({
    method: "POST",
    url: url,
    headers: {
      "Content-Type": "application/json",
      Authorization: req.token,
    },
  })
    .then(({ data }) => {
      console.log("data");
      console.log(data);
      res
        .status(200)
        .json({ message: "data enviada correctamente", data: data });
    })
    .catch((err) => {
      console.log("error");
      console.error(err);
      res.status(500).json({
        error: `Ha ocurrido un problema con el servidor: ${err}`,
      });
    });

});

app.get("*", function (req, res, next) {
  res.status(404).send("Página no encontrada");
});

app.listen(PORT, () => {
  console.log(`Servidor al parecer en ejecución en el puerto que es ${PORT}`);
});