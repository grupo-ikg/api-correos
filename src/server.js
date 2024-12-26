require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");
const docusign = require("docusign-esign");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 4000;
const jwt = require("jsonwebtoken");
const tokenExpiration = "1h";
const secretKey = process.env.SECRET_JWT;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "desarrolladorweb@cavca.com.co", // Cambia esto con tu dirección de correo electrónico de Gmail
    pass: "Wil3224601736@", // Cambia esto con tu contraseña de correo electrónico de Gmail
  },
});

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
      url: "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/oauth2/token?client_id=3MVG9WCdh6PFin0jN5Df21kRJKitsev2I72yjCeJIXS_5feLY5bSdIu9QYh1YGFa2_0GRD12xqGKi4S417M_n&client_secret=D851257982E517A9E351DCCA88AE58A73C8EED287923C1F43E8DDB2EE52B687D&username=jescobar@crediseguro.co.pruebamc&password=SalesCredi2024&grant_type=password",
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

    if (!token) {
        return res.status(403).send({ auth: false, message: 'No token provided.' });
    }

    const validation = validateToken(token);

    if (!validation.valid) {
        return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' });
    }

    req.client = validation.decoded; // Guarda los datos decodificados en req.client
    next(); // Continúa con la siguiente función o ruta
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

          console.log(consentUrl);
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
      url: "https://cavca--cotizador.sandbox.my.salesforce.com/services/oauth2/token?client_id=3MVG9xfrbKQ6hBytnC5pEE29nNkmzKUISBHM533rGfM..GayQeCLp4fguxblmS9.3_BpGN00MCoJMEMenNtpf&client_secret=E0C255B2B27D89D7E8D0B7D99F3F61276BFAD0697FCF9B8B914F450734F7647E&username=desarrolladorsc1@cavca.com.co.cotizador&password=Tecnologia2023/&grant_type=password",
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


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

app.use(cors());

app.get("/generate-token", (req, res) => {
  const { clientId, clientSecret } = req.query;

  try {
    const token = generateToken(clientId, clientSecret);
    res.json({ auth: true, token: token });
  } catch (error) {
    res.status(401).send({ auth: false, message: error.message });
  }
});

//envio de correos
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

//envio de archivos
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

// obtener ciudades de salesforce - migrar a salesforce
app.post("/getLocation", getToken, (req, res) => {
  const { id_department, get_cities, get_departments } = req.body;

  try {
    const body = {
      quiereDepartamentos: get_departments,
      quiereCiudad: get_cities,
      IdParafiltrar: id_department,
    };
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

// envio de formulario de crediseguro salesforce
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

// envio de formulario de crediseguro renovaciones salesforce
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

//envio documento de identidad OCR
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

//envio documento de poliza de aseguradora OCR
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

// envio de datos poliza desde OCR
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

// obtener informacion de poliza  - migrar
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

// obtener informacion de documento  - migrar
app.get("/getDocument/:document", getToken, (req, res) => {
  axios({
    method: "GET",
    url: `https://crediseguro.my.salesforce.com/services/apexrest/V1/Info_Client/${req.params.document}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.token}`,
    },
  }).then(({ data }) => {
    console.log(data);

    if (data.IdCliente) {
      const valueEmail = data.Email;
      const valuePhone = data.Phone;
      const chars = 5; // Cantidad de caracters visibles

      const email_masked = valueEmail.replace(
        /[a-z0-9\-_.]+@/gi,
        (c) =>
          c.substr(0, chars) +
          c
            .split("")
            .slice(chars, -1)
            .map((v) => "*")
            .join("") +
          "@"
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
  });
});

// actualizar cuenta druo
app.post("/updateAccountDruo", getToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      IdCuenta: data.primary_reference,
      IdCuentaDruo: data.uuid,
    };

    console.log(body);

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

// actualizar pago druo
app.post("/updatePaymentDruo", getToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      id_cuota: data.primary_reference,
      status: data.status,
      Valor: data.amount,
      Code: data.code,
    };

    console.log(body);

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

// obtener reseñas google 
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

      // signer2.tabs = docusign.Tabs.constructFromObject({
      //   textTabs: [
      //     nombre_proyecto_1,
      //     fidecomiso_1,
      //     fecha_escrituracion,
      //     comprador_nombre_1,
      //     comprador_identificacion_1,
      //     comprador_expedicion_1,
      //     comprador_estado_civil_1,
      //     comprador_direccion_1,
      //     comprador_telefono_1,
      //     comprador_email_1,
      //     comprador_nombre_2,
      //     comprador_identificacion_2,
      //     comprador_expedicion_2,
      //     comprador_estado_civil_2,
      //     comprador_direccion_2,
      //     comprador_telefono_2,
      //     comprador_email_2,
      //     agrupacion,
      //     area_privada,
      //     valor_inmueble_letras_1,
      //     valor_inmueble_numero,
      //     valor_smlv_letras,
      //     valor_smlv_numero,
      //     fiducia,
      //     nombre_proyecto_2,
      //     apartamento,
      //     torre,
      //     area_construida_2,
      //     area_privada_2,
      //     nombre_proyecto_3,
      //     nombre_proyecto_4,
      //     nombre_proyecto_5,
      //     nombre_proyecto_6,
      //     nombre_proyecto_7,
      //     smlv_valor,
      //     valor_inmueble_letras_2,
      //     valor_inmueble_numero_2,
      //     fidecomiso_2,
      //     fidecomiso_3,
      //     smlv_escritura,
      //     entidad_1,
      //     valor_entidad_1,
      //     valor_entidad_letras_1,
      //     entidad_2,
      //     valor_entidad_2,
      //     valor_entidad_letras_2,
      //     entidad_3,
      //     valor_entidad_3,
      //     valor_entidad_letras_3,
      //     fidecomiso_4,
      //     fidecomiso_5,
      //     fidecomiso_6,
      //     fidecomiso_7,
      //     fidecomiso_8,
      //     fidecomiso_9,
      //     fidecomiso_10,
      //     nombre_proyecto_8,
      //     nombre_proyecto_20,
      //     fidecomiso_11,
      //     clausula_11,
      //     nombre_proyecto_9,
      //     nombre_proyecto_10,
      //     nombre_proyecto_11,
      //     nombre_proyecto_12,
      //     nombre_proyecto_13,
      //     nombre_proyecto_14,
      //     fidecomiso_12,
      //     nombre_proyecto_15,
      //     conyuge_nombre,
      //     conyuge_documento,
      //     nombre_proyecto_16,
      //     agrupacion_2,
      //     comprador_nombre_3,
      //     comprador_identificacion_3,
      //     tipo_venta,
      //     valor_venta,
      //     subtotal,
      //     cancelado_a_fecha,
      //     fecha_separacion,
      //     valor_separacion,
      //     fecha_cuota,
      //     valor_cuota,
      //     fecha_cesantias,
      //     valor_cesantias,
      //     fecha_ahorro_programado,
      //     valor_ahorro_programado,
      //     fecha_pensiones_obligatorias,
      //     valor_pensiones_obligatorias,
      //     fecha_cuenta_afc,
      //     valor_cuenta_afc,
      //     fecha_abono_cuota_inicial,
      //     valor_bono_cuota_inicial,
      //     fecha_subsidio,
      //     valor_subsidio,
      //     fecha_subsidio_concurrente,
      //     valor_subsidio_concurrente,
      //     fecha_subsidio_habitat,
      //     valor_subsidio_habitat,
      //     fecha_credito,
      //     valor_credito,
      //     valor_total,
      //     nombre_proyecto_17,
      //     agrupacion_3,
      //     comprador_nombre_4,
      //     comprador_identificacion_4,
      //     tipo_inmueble,
      //     nombre_proyecto_18,
      //     nombre_proyecto_19,
      //     area_construida_total,
      //   ],
      // });

      // Crear el sobre utilizando la plantilla
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

app.post("/updateOppCavca", getTokenDevCavca, verifyToken, (req, res) => {
  const { data } = req.body;

  try {
    const body = {
      cedula: data.cedula,
      placa: data.placa,
      ListaDatos: [
        {
          IdCotizacion: data.IdCotizacion,           
          Bolivar_Premium: data.Bolivar_Premium ,
          HDI_Livianos_Full: data.HDI_Livianos_Full ,
          Bolivar_Estandar: data.Bolivar_Estandar ,
          AXAPlusAsis_Plus: data.AXAPlusAsis_Plus ,
          Bolivar_Clasico: data.Bolivar_Clasico ,
          AXAPlusAsis_VIP: data.AXAPlusAsis_VIP ,
          SBS_OtrasCiudades: data.SBS_OtrasCiudades ,
          Mapfre_ParaLaMujer: data.Mapfre_ParaLaMujer ,
          SBS_Full: data.SBS_Full ,
          Mapfre_SuperTrebol: data.Mapfre_SuperTrebol ,
          SBS_Estandar: data.SBS_Estandar ,
          Mapfre_TrebolBasico: data.Mapfre_TrebolBasico ,
          Equidad_AutoPlusFull_Elite: data.Equidad_AutoPlusFull_Elite ,
          Liberty_Premium_ConVidrios: data.Liberty_Premium_ConVidrios ,
          Sura_Global: data.Sura_Global ,
          Liberty_Premium: data.Liberty_Premium ,
          Sura_Clasico: data.Sura_Clasico ,
          Liberty_Integral: data.Liberty_Integral ,
          Zurich_Full: data.Zurich_Full ,
          Liberty_Silver2_VehiculoSustituto: data.Liberty_Silver2_VehiculoSustituto ,
          Zurich_Basico: data.Zurich_Basico ,
          Liberty_Silver1_VehiculoSustituto: data.Liberty_Silver1_VehiculoSustituto ,
          Solidaria_Elite: data.Solidaria_Elite ,
          Liberty_Basico_PT: data.Liberty_Basico_PT ,
          Solidaria_Premium: data.Solidaria_Premium ,
          Liberty_Bronze1: data.Liberty_Bronze1 ,
          Solidaria_Plus: data.Solidaria_Plus ,
          Previsora_Full: data.Previsora_Full ,
          Previsora_Estandar: data.Previsora_Estandar ,
          Seg_Estado_Inv_Cavca: data.Seg_Estado_Inv_Cavca ,
          AXA_Vip_asis_esencial: data.AXA_Vip_asis_esencial ,
        },
      ],
    };

    axios({
      method: "POST",
      url: "https://cavca--cotizador.sandbox.my.salesforce.com/services/apexrest/V1/UpdateOpp",
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

app.listen(PORT, () => {
  console.log(`Servidor al parecer en ejecución en el puerto que es ${PORT}`);
});
