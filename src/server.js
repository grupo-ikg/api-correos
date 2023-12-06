require("dotenv").config();
const express = require("express");
var bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

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
      url: "https://crediseguro.my.salesforce.com/services/oauth2/token?client_id=3MVG9Kip4IKAZQEUlyFdDD9WcTyDDBuIutxE0WbcmTdXUvEMFQaH7UnNZSogacikiF29SzwJ5gsuB_z9B.fYk&client_secret=55DF5BCCC7D765601D74D7B413081145B6D81066BD0C7811C336CD82B587B921&username=integracioncs@crediseguro.co&password=1nt3gr@cionCredi2020&grant_type=password"
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
      url: "https://test.salesforce.com/services/oauth2/token?client_id=3MVG934iBBsZ.kUGJW_XmNtzKUtBzIeoJrLXxyG5T02h4Mfyc74lkWgrleeUGH8gQovY74z_lZsZ6jkKty4Xb&client_secret=A1A8001E8F354B8F0B36493F3BAB9E1193139CB7F88CDA66F89AA4ED7F9F2E97&username=jescobar@crediseguro.co.pruebamc&password=Credi123*&grant_type=password",
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

app.post("/send", (req, res) => {
  const { destinatario, asunto, mensaje } = req.body;

  const mailOptions = {
    from: "desarrolladorweb@cavca.com.co",
    to: [destinatario[0], destinatario[1]],
    subject: asunto,
    text: mensaje,
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

app.post("/sendDocs", upload.any(), (req, res) => {
  const docs = req.files;

  const mailOptions = {
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

  console.log(birthdate)
  console.log(init_term)

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
    })
      .then(({data}) => {
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

app.post("/sendDocument", getTokenDev, (req, res) => {

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
    fileExtension
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
      url: "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/PreCreditoDoc",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {

      const bodyText = {
        text:
          "Se enviaron los siguientes datos de la cedula" +
          JSON.stringify(body),
      };

      axios({
        method: "POST",
        url: "https://chat.googleapis.com/v1/spaces/AAAAM0xrHks/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=c_r-S9rceAhR7JEGBlMJz7_6BhCFduDksVdd9hMSpxE",
        headers: {
          "Content-Type": "application/json"
        },
        data: JSON.stringify(bodyText),
      })

      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200,
        data: data
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

app.post("/sendDocPoliza", getTokenDev, (req, res) => {
  const {
    Id,
    fileName,
    fileBody,
    fileExtension,
  } = req.body;

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
      url: "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/PreCreditoDocPoliza",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: JSON.stringify(body),
    }).then(({ data }) => {

      const bodyText = {
        text:
          "Se envio la siguiente poliza" +
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
        data: data
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

app.post("/sendPoliza", getTokenDev, (req, res) => {
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
    Beneficiario
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
      Telefono_Beneficiario:  Telefono_Beneficiario, //String
      Genero_Asegurado: Genero_Asegurado, //String
      Placa: Placa, //String *
      Modelo: Modelo, //String
      Total_Prima: Total_Prima, //String no con decimales *
      Intermediarios: Intermediarios, //String
      No_Riesgo: No_Riesgo, //String
      Email_Tomador: Email_Tomador, //String
      Fecha_Nacimiento_Asegurado: Fecha_Nacimiento_Asegurado, //Date (DD/MM/YYYY)
      Email_Asegurado: Email_Asegurado, //String
      Email_Beneficiario: Email_Beneficiario, //String
      Clase_de_Vehiculo: Clase_de_Vehiculo, //String
      Ciudad_de_Circulacion: Ciudad_de_Circulacion, //String
      Ramo: Ramo, //String
      Linea: Linea, //String
      Beneficiario: Beneficiario, //String
    };

    axios({
      method: "POST",
      url: "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/PreCreditoPoliza",
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
        data: data
      });
    });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor al parecer en ejecución en el puerto ${PORT}`);
});
