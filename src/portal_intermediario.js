const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
class Treble {
  generarId = (longitud) => {
    const caracteres = "0123456789abcdef";
    let resultado = "";
    for (let i = 0; i < longitud; i++) {
      resultado += caracteres.charAt(
        Math.floor(Math.random() * caracteres.length)
      );
    }
    return resultado;
  };

  update = (id, data) => {
    axios.post("https://main.treble.ai/session/" + id + "/update", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  };
  async shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return response.data;
    } catch (error) {
        console.error('Error acortando la URL:', error);
        return null;
    }
  }

  notificationChat = (phone, event) => {
    const bodyText = {
      text:
        "Se realizo un proceso en el bot intermediario" +
        JSON.stringify({
          phone: phone,
          event: event,
        }),
    };

    axios({
      method: "POST",
      url: "https://chat.googleapis.com/v1/spaces/AAAAcWP8h6A/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=KEmIEVWDszYt6aWr74PF0nzPlMpGjGpXrj05r7xL0cs",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(bodyText),
    });
  };

  autentication = async (data) => {

    this.notificationChat(data.cellphone, "inicio nuevo proceso");

    const session_id = data.session_id;
    const claveInicio = data.user_session_keys.find(
      (item) => item.key === "clave_inicio"
    );
    const nitInicio = data.user_session_keys.find(
      (item) => item.key === "nit_inicio"
    );

    await axios({
      method: "POST",
      url: "https://dev.back-crediseguro.com/api/login",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        document: nitInicio.value,
        password: Buffer.from(claveInicio.value).toString("base64"),
        type: 0,
      }),
    })
      .then(({ data }) => {
        this.update(session_id, {
          user_session_keys: [
            {
              key: "autenticacion_crediseguro",
              value: "1",
            },
            {
              key: "token_crediseguro",
              value: data.data,
            },
          ],
        });
      })
      .catch((error) => {

        this.notificationChat(data.cellphone, error);

        this.update(session_id, {
          user_session_keys: [
            {
              key: "autenticacion_crediseguro",
              value: "0",
            },
          ],
        });
      });

    return "procesando";
  };

  validate = async (data) => {
    const session_id = data.session_id;
    const id_peticion = this.generarId(12);

    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );

    const numero_documento_1 = data.user_session_keys.find(
      (item) => item.key === "numero_documento_1"
    );

    let id_intermediario = await axios
      .put(
        "https://portal.back-crediseguro.com/api/credit-ocr",
        {
          vig_inicial: null,
          sexo: null,
          prima_total: null,
          placa: null,
          ocupacion_titular_credito: null,
          numero_doc: null,
          nombres: null,
          no_poliza: null,
          no_cuotas: null,
          linea: null,
          ingresos_titular_del_credito: null,
          id: id_peticion,
          fecha_nacimiento: null,
          fecha_expedicion: null,
          estado_civil: null,
          departamento_nacimiento: null,
          departamento_expedicion: null,
          correo_electronico: null,
          ciudad_nacimiento: null,
          ciudad_expedicion: null,
          cel_titular_credito: null,
          asesor_intermediario: null,
          apellidos: "Treble",
          abono_inicial: null,
          id_sucursal: null,
          ciudad_residencia: null,
          direccion_residencia: null,
          es_renovacion: false,
          vehiculo0kms: false,
        },
        {
          headers: {
            authorization: "Bearer " + token_crediseguro.value,
            "content-type": "application/json",
          },
        }
      )
      .then((response) => {
        return response.data.data.IdIntermediario;
      })
      .catch((error) => {
        return "0";
      });

    axios
      .get(
        "https://back-crediseguro.com/getDocument/" +
          numero_documento_1.value
      )
      .then((response) => {
        if (response.data) {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "valida_documento_crediseguro",
                value: "1",
              },
              {
                key: "id_peticion_crediseguro",
                value: id_peticion,
              },
              {
                key: "id_intermediario_crediseguro",
                value: id_intermediario,
              },
            ],
          });
        } else {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "valida_documento_crediseguro",
                value: "2",
              },
              {
                key: "id_peticion_crediseguro",
                value: id_peticion,
              },
              {
                key: "id_intermediario_crediseguro",
                value: id_intermediario,
              },
            ],
          });
        }
      })
      .catch((error) => {
        console.log(error);
        this.notificationChat(data.cellphone, error);

        this.update(session_id, {
          user_session_keys: [
            {
              key: "autenticacion_crediseguro",
              value: "0",
            },
            {
              key: "id_peticion_crediseguro",
              value: "",
            },
            {
              key: "id_intermediario_crediseguro",
              value: "",
            },
          ],
        });
      });

    return "procesando";
  };

  uploadDocument = async (data) => {
    const session_id = data.session_id;

    const archivo_documento = data.user_session_keys.find(
      (item) => item.key === "archivo_documento"
    );

    if (!archivo_documento) {
      console.error("No se encontró 'archivo_documento' en user_session_keys.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "documento_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else if (!archivo_documento.value) {
      console.error(
        "'archivo_documento' está presente pero no contiene un valor."
      );
      this.update(session_id, {
        user_session_keys: [
          {
            key: "documento_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else {
      const tipo_documento_1 = data.user_session_keys.find(
        (item) => item.key === "tipo_documento_1"
      );
      const id_peticion_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_peticion_crediseguro"
      );
      const id_intermediario_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_intermediario_crediseguro"
      );
      const formato_documento = data.user_session_keys.find(
        (item) => item.key === "formato_documento"
      );

      const fileName = path.basename(new URL(archivo_documento.value).pathname);

      // Descargar el archivo como stream
      const response = await axios.get(archivo_documento.value, {
        responseType: "stream",
      });

      // enviar correo
      const formMail = new FormData();
      formMail.append(
        "message",
        "Hola, has cedula una poliza de un cliente desde nuestro bot de intermediarios. Abre este correo para revisarlo."
      );
      formMail.append("sender", "desarrolladorsc@cavca.com.co");
      formMail.append("subject", "Solicitud de Crédito Nuevo OCR - BOT");
      formMail.append("document", id_peticion_crediseguro.value);
      formMail.append("cc", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });

      // Realizar la solicitud POST
      axios
        .post("https://crediseguro-back.click/sendDocs", formMail)
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          this.notificationChat(data.cellphone, error);

          console.error(error);
        });

      // Crear el form-data y agregar el archivo y demás campos
      const form = new FormData();
      form.append("file", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });
      form.append("type_doc", formato_documento.value);
      form.append("id", id_peticion_crediseguro.value);
      form.append("insurance", tipo_documento_1.value);
      form.append("id_intermediario", id_intermediario_crediseguro.value);

      // Configurar la URL de envío y las cabeceras necesarias
      const sendFileUrl =
        "https://sendfile.crediseguro-back.click/send_file?_id=" +
        id_peticion_crediseguro.value +
        "&insurance=" +
        tipo_documento_1.value;

      const result = await axios.post(sendFileUrl, form);

      this.update(session_id, {
        user_session_keys: [
          {
            key: "documento_cargado_crediseguro",
            value: "1",
          },
        ],
      });

      console.log("Archivo enviado exitosamente:", result.data);
    }

    return "procesando";
  };

  uploadPolicy = async (data) => {
    const session_id = data.session_id;
    let insurance = "";
    let type_doc = "";
    let id_aseguradora = "";

    const archivo_poliza = data.user_session_keys.find(
      (item) => item.key === "archivo_poliza"
    );
    const mundial_formato_1 = data.user_session_keys.find(
      (item) => item.key === "mundial_formato_1"
    );
    const mundial_formato_2 = data.user_session_keys.find(
      (item) => item.key === "mundial_formato_2"
    );
    const equidad_formato_1 = data.user_session_keys.find(
      (item) => item.key === "equidad_formato_1"
    );
    const equidad_formato_2 = data.user_session_keys.find(
      (item) => item.key === "equidad_formato_2"
    );
    const solidaria_formato_1 = data.user_session_keys.find(
      (item) => item.key === "solidaria_formato_1"
    );
    const solidaria_formato_2 = data.user_session_keys.find(
      (item) => item.key === "solidaria_formato_2"
    );
    const solidaria_formato_3 = data.user_session_keys.find(
      (item) => item.key === "solidaria_formato_3"
    );
    const solidaria_formato_4 = data.user_session_keys.find(
      (item) => item.key === "solidaria_formato_4"
    );
    const sura_formato_1 = data.user_session_keys.find(
      (item) => item.key === "sura_formato_1"
    );
    const sura_formato_2 = data.user_session_keys.find(
      (item) => item.key === "sura_formato_2"
    );


    if (!archivo_poliza) {
      this.notificationChat(data.cellphone, "No se encontró 'archivo_poliza'");
      console.error("No se encontró 'archivo_poliza' en user_session_keys.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "poliza_cargada_crediseguro",
            value: "0",
          },
        ],
      });
    } else if (!archivo_poliza.value) {

      this.notificationChat(
        data.cellphone,
        "'archivo_poliza' está presente pero no contiene un valor."
      );
      console.error(
        "'archivo_poliza' está presente pero no contiene un valor."
      );
      this.update(session_id, {
        user_session_keys: [
          {
            key: "poliza_cargada_crediseguro",
            value: "0",
          },
        ],
      });
    } else {

      const aseguradora = data.user_session_keys.find(
        (item) => item.key === "aseguradora"
      );

      if (aseguradora.value == "AXA Colpatria Seguros S.A") {
        insurance = "AXA-0013h00000GiwbUAAR";
        type_doc = "other";
        id_aseguradora = "0013h00000GiwbUAAR";
      } else if (aseguradora.value == "Compañía Seguros Mundial S.A.") {
        insurance = "MUNDIAL-0013h00000GiwbWAAR";
        id_aseguradora = "0013h00000GiwbWAAR";
        if (mundial_formato_1.value == "Si") {
          type_doc = "formato_1";
        } else if (
          mundial_formato_1.value == "No" &&
          mundial_formato_2.value == "Si"
        ) {
          type_doc = "formato_2";
        }
      } else if (aseguradora.value == "Seguros Bolivar S.A.") {
        insurance = "BOLIVAR-0013h00000GiwbdAAB";
        type_doc = "other";
        id_aseguradora = "0013h00000GiwbdAAB";
      } else if (aseguradora.value == "La Equidad Seguros Generales S.A.") {
        insurance = "EQUIDAD-0013h00000DgV5TAAV";
        if (equidad_formato_1.value == "Si") {
          type_doc = "formato_1";
        } else if (
          equidad_formato_1.value == "No" &&
          equidad_formato_2.value == "Si"
        ) {
          type_doc = "formato_2";
        }
        id_aseguradora = "0013h00000DgV5TAAV";
      } else if (aseguradora.value == "SBS Seguros Colombia S.A.") {
        insurance = "SBS";
        type_doc = "SBS-0013h00000GiwbcAAB";
        id_aseguradora = "0013h00000GiwbcAAB";
      } else if (aseguradora.value == "Aseguradora Solidaria de Colombia") {
        insurance = "SOLIDARIA-0013h00000GiwbTAAR";
        if (solidaria_formato_1.value == "Si") {
          type_doc = "formato_1";
        } else if (
          solidaria_formato_1.value == "No" &&
          solidaria_formato_2.value == "Si"
        ) {
          type_doc = "formato_2";
        } else if (
          solidaria_formato_1.value == "No" &&
          solidaria_formato_2.value == "No" &&
          solidaria_formato_3.value == "Si"
        ) {
          type_doc = "formato_3";
        } else if (
          solidaria_formato_1.value == "No" &&
          solidaria_formato_2.value == "No" &&
          solidaria_formato_3.value == "No" &&
          solidaria_formato_4.value == "Si"
        ) {
          type_doc = "formato_4";
        }
        id_aseguradora = "0013h00000GiwbTAAR";
      } else if (aseguradora.value == "HDI Seguros S.A.") {
        insurance = "HDI-0013h00000DgTUOAA3";
        type_doc = "other";
        id_aseguradora = "0013h00000DgTUOAA3";
      } else if (aseguradora.value == "La Previsora S.A.") {
        insurance = "PREVISORA-0013h00000GiwbYAAR";
        type_doc = "other";
        id_aseguradora = "0013h00000GiwbYAAR";
      } else if (aseguradora.value == "Allianz Colombia S.A.") {
        insurance = "ALLIANZ-0013h00000DgPwsAAF";
        type_doc = "other";
        id_aseguradora = "0013h00000DgPwsAAF";
      } else if (aseguradora.value == "Mapfre Seguros Generales de Colombia S.A.") {
        insurance = "MAPFRE-0013h00000GiwbaAAB";
        type_doc = "other";
        id_aseguradora = "0013h00000GiwbaAAB";
      } else if (aseguradora.value == "Seguros Generales Suramericana S.A.") {
        insurance = "SURA-0013h00000GiwbfAAB";
        if (sura_formato_1.value == "Si") {
          type_doc = "formato_1";
        } else if (
          sura_formato_1.value == "No" &&
          sura_formato_2.value == "Si"
        ) {
          type_doc = "formato_2";
        }
        id_aseguradora = "0013h00000GiwbfAAB";
      } else if (aseguradora.value == "Zurich Colombia Seguros S.A.") {
        insurance = "ZURICH-0013h00000GiwbbAAB";
        type_doc = "other";
        id_aseguradora = "0013h00000GiwbbAAB";
      } else if (aseguradora.value == "Liberty Seguros S.A.") {
        insurance = "LIBERTY-0013h00000GiwbZAAR";
        type_doc = "other";
        id_aseguradora = "0013h00000GiwbZAAR";
      }

      const id_peticion_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_peticion_crediseguro"
      );
      const id_intermediario_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_intermediario_crediseguro"
      );

      const fileName = path.basename(new URL(archivo_poliza.value).pathname);

      // Descargar el archivo como stream
      const response = await axios.get(archivo_poliza.value, {
        responseType: "stream",
      });

      // enviar correo
      const formMail = new FormData();
      formMail.append(
        "message",
        "Hola, has recibido una cedula de un cliente desde nuestro bot de intermediarios. Abre este correo para revisarlo"
      );
      formMail.append("sender", "desarrolladorsc@cavca.com.co");
      formMail.append("subject", "Solicitud de Crédito Nuevo OCR - BOT");
      formMail.append("document", id_peticion_crediseguro.value);
      formMail.append("policy", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });

      // Realizar la solicitud POST
      axios
        .post("https://crediseguro-back.click/sendDocs", formMail)
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          this.notificationChat(data.cellphone,error);
          console.error(error);
        });

      // Crear el form-data y agregar el archivo y demás campos
      const form = new FormData();
      form.append("file", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });
      form.append("type_doc", type_doc);
      form.append("id", id_peticion_crediseguro.value);
      form.append("insurance", insurance);
      form.append("id_intermediario", id_intermediario_crediseguro.value);

      // Configurar la URL de envío y las cabeceras necesarias
      const sendFileUrl =
        "https://sendfile.crediseguro-back.click/send_file?_id=" +
        id_peticion_crediseguro.value +
        "&insurance=" +
        insurance;

      const result = await axios.post(sendFileUrl, form);

      this.update(session_id, {
        user_session_keys: [
          {
            key: "poliza_cargada_crediseguro",
            value: "1",
          },
          { key: "id_aseguradora", value: id_aseguradora },
        ],
      });

      console.log("Archivo enviado exitosamente:", result.data);
    }

    return "procesando";
  };

  uploadExhibit = async (data) => {
    const session_id = data.session_id;

    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );

    const archivo_anexo = data.user_session_keys.find(
      (item) => item.key === "archivo_anexo"
    );

    if (!archivo_anexo) {
      this.notificationChat(data.cellphone, "No se encontró 'archivo_anexo'");
      console.error("No se encontró 'archivo_anexo' en user_session_keys.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "anexo_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else if (!archivo_anexo.value) {
      this.notificationChat(data.cellphone, "'archivo_anexo' está presente pero no contiene un valor.");
      console.error("'archivo_anexo' está presente pero no contiene un valor.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "anexo_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else {
      const id_peticion_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_peticion_crediseguro"
      );

      const fileName = path.basename(new URL(archivo_anexo.value).pathname);

      const fileResponse = await axios.get(archivo_anexo.value, {
        responseType: "arraybuffer",
      });

      // 2. Convertir el contenido a base64
      const base64File = Buffer.from(fileResponse.data, "binary").toString(
        "base64"
      );

      // 3. Preparar el payload con el contenido base64
      const payload = {
        id: id_peticion_crediseguro.value,
        name: fileName,
        body: base64File,
      };

      // 4. Ejecutar la solicitud POST a la API
      const result = await axios.post(
        "https://dev.back-crediseguro.com/api/upload-document",
        payload,
        {
          headers: {
            authorization: "Bearer " + token_crediseguro.value,
            "content-type": "application/json",
          },
        }
      );

      this.update(session_id, {
        user_session_keys: [
          {
            key: "anexo_cargado_crediseguro",
            value: "1",
          },
        ],
      });

      console.log("Archivo enviado exitosamente:", result.data);
    }

    return "procesando";
  };

  getData = async (data) => {
    const session_id = data.session_id;
    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );
    const id_peticion_crediseguro = data.user_session_keys.find(
      (item) => item.key === "id_peticion_crediseguro"
    );

    const result = await axios.get(
      "https://dev.back-crediseguro.com/api/credit-ocr?id=" +
        id_peticion_crediseguro.value,
      {
        headers: {
          authorization: "Bearer " + token_crediseguro.value,
          "content-type": "application/json",
        },
      }
    );

    const Vig_inicial_ocr =
      result.data.data.Vig_inicial === null ? "" : result.data.data.Vig_inicial;
    const Vehiculo0kms_ocr =
      result.data.data.Vehiculo0kms === null
        ? ""
        : result.data.data.Vehiculo0kms;
    const TomadorReal_ocr =
      result.data.data.TomadorReal === null ? "" : result.data.data.TomadorReal;
    const tipoVehiculo_ocr =
      result.data.data.tipoVehiculo === null
        ? ""
        : result.data.data.tipoVehiculo;
    const Tipo_Documento_ocr =
      result.data.data.Tipo_Documento === null
        ? ""
        : result.data.data.Tipo_Documento;
    const Sexo_ocr =
      result.data.data.Sexo === null ? "" : result.data.data.Sexo;
    const Riesgo_ocr =
      result.data.data.Riesgo === null ? "" : result.data.data.Riesgo;
    const PrimaNetaHDI_ocr =
      result.data.data.PrimaNetaHDI === null
        ? ""
        : result.data.data.PrimaNetaHDI;
    const Prima_Total_ocr =
      result.data.data.Prima_Total === null ? "" : result.data.data.Prima_Total;
    const Placa_ocr =
      result.data.data.Placa === null ? "" : result.data.data.Placa;
    const oficina_ocr =
      result.data.data.oficina === null ? "" : result.data.data.oficina;
    const Ocupacion_Titular_Credito_ocr =
      result.data.data.Ocupacion_Titular_Credito === null
        ? ""
        : result.data.data.Ocupacion_Titular_Credito;
    const ObservacionesAnexo_ocr =
      result.data.data.ObservacionesAnexo === null
        ? ""
        : result.data.data.ObservacionesAnexo;
    const Obs_Portal_ocr =
      result.data.data.Obs_Portal === null ? "" : result.data.data.Obs_Portal;
    const NumeroDoc_ocr =
      result.data.data.NumeroDoc === null ? "" : result.data.data.NumeroDoc;
    const NovedadesOCR_ocr =
      result.data.data.NovedadesOCR === null
        ? ""
        : result.data.data.NovedadesOCR;
    const Nombres_ocr =
      result.data.data.Nombres === null ? "" : result.data.data.Nombres;
    const NoCertificado_ocr =
      result.data.data.NoCertificado === null
        ? ""
        : result.data.data.NoCertificado;
    const No_Poliza_ocr =
      result.data.data.No_Poliza === null ? "" : result.data.data.No_Poliza;
    const No_Cuotas_ocr =
      result.data.data.No_Cuotas === null ? "" : result.data.data.No_Cuotas;
    const Linea_ocr =
      result.data.data.Linea === null ? "" : result.data.data.Linea;
    const Ingresos_Titular_Del_Credito_ocr =
      result.data.data.Ingresos_Titular_Del_Credito === null
        ? ""
        : result.data.data.Ingresos_Titular_Del_Credito;
    const Ing_Intermediario_ocr =
      result.data.data.Ing_Intermediario === null
        ? ""
        : result.data.data.Ing_Intermediario;
    const Idsucursal_ocr =
      result.data.data.Idsucursal === null ? "" : result.data.data.Idsucursal;
    const IdSolicitante_ocr =
      result.data.data.IdSolicitante === null
        ? ""
        : result.data.data.IdSolicitante;
    const IdIntermediario_ocr =
      result.data.data.IdIntermediario === null
        ? ""
        : result.data.data.IdIntermediario;
    const Id_ocr = result.data.data.Id === null ? "" : result.data.data.Id;
    const FechaNacimiento_ocr =
      result.data.data.FechaNacimiento === null
        ? ""
        : result.data.data.FechaNacimiento;
    const FechaExpedicion_ocr =
      result.data.data.FechaExpedicion === null
        ? ""
        : result.data.data.FechaExpedicion;
    const EstadoCivil_ocr =
      result.data.data.EstadoCivil === null ? "" : result.data.data.EstadoCivil;
    const Estado_ocr =
      result.data.data.Estado === null ? "" : result.data.data.Estado;
    const Es_Renovacion_ocr =
      result.data.data.Es_Renovacion === null
        ? ""
        : result.data.data.Es_Renovacion;
    const Documento_Poliza_ocr =
      result.data.data.Documento_Poliza === null
        ? ""
        : result.data.data.Documento_Poliza;
    const Doc_Tomador_ocr =
      result.data.data.Doc_Tomador === null ? "" : result.data.data.Doc_Tomador;
    const Doc_Asegurado_ocr =
      result.data.data.Doc_Asegurado === null
        ? ""
        : result.data.data.Doc_Asegurado;
    const DireccionDeResidencia_ocr =
      result.data.data.DireccionDeResidencia === null
        ? ""
        : result.data.data.DireccionDeResidencia;
    const DepartamentoDeNacimiento_ocr =
      result.data.data.DepartamentoDeNacimiento === null
        ? ""
        : result.data.data.DepartamentoDeNacimiento;
    const DepartamentoDeExpedicion_ocr =
      result.data.data.DepartamentoDeExpedicion === null
        ? ""
        : result.data.data.DepartamentoDeExpedicion;
    const Correo_Electronico_ocr =
      result.data.data.Correo_Electronico === null
        ? ""
        : result.data.data.Correo_Electronico;
    const CiudadDeResidencia_ocr =
      result.data.data.CiudadDeResidencia === null
        ? ""
        : result.data.data.CiudadDeResidencia;
    const CiudadDeNacimiento_ocr =
      result.data.data.CiudadDeNacimiento === null
        ? ""
        : result.data.data.CiudadDeNacimiento;
    const CiudadDeExpedicion_ocr =
      result.data.data.CiudadDeExpedicion === null
        ? ""
        : result.data.data.CiudadDeExpedicion;
    const Cel_Titular_Credito_ocr =
      result.data.data.Cel_Titular_Credito === null
        ? ""
        : result.data.data.Cel_Titular_Credito;
    const Asesor_Intermediario_ocr =
      result.data.data.Asesor_Intermediario === null
        ? ""
        : result.data.data.Asesor_Intermediario;
    const Aseguradora_ocr =
      result.data.data.Aseguradora === null ? "" : result.data.data.Aseguradora;
    const Apellidos_ocr =
      result.data.data.Apellidos === null ? "" : result.data.data.Apellidos;
    const Anexo_ocr =
      result.data.data.Anexo === null ? "" : result.data.data.Anexo;
    const Abono_Inicial_ocr =
      result.data.data.Abono_Inicial === null
        ? ""
        : result.data.data.Abono_Inicial;

    this.update(session_id, {
      user_session_keys: [
        { key: "Vig_inicial_ocr", value: Vig_inicial_ocr },
        { key: "Vehiculo0kms_ocr", value: '"' + Vehiculo0kms_ocr + '"' },
        { key: "TomadorReal_ocr", value: TomadorReal_ocr },
        { key: "tipoVehiculo_ocr", value: tipoVehiculo_ocr },
        { key: "Tipo_Documento_ocr", value: Tipo_Documento_ocr },
        { key: "Sexo_ocr", value: Sexo_ocr },
        { key: "Riesgo_ocr", value: Riesgo_ocr },
        { key: "PrimaNetaHDI_ocr", value: PrimaNetaHDI_ocr },
        { key: "Prima_Total_ocr", value: Prima_Total_ocr },
        { key: "Placa_ocr", value: Placa_ocr },
        { key: "oficina_ocr", value: oficina_ocr },
        {
          key: "Ocupacion_Titular_Credito_ocr",
          value: Ocupacion_Titular_Credito_ocr,
        },
        { key: "ObservacionesAnexo_ocr", value: ObservacionesAnexo_ocr },
        { key: "Obs_Portal_ocr", value: Obs_Portal_ocr },
        { key: "NumeroDoc_ocr", value: NumeroDoc_ocr },
        { key: "NovedadesOCR_ocr", value: NovedadesOCR_ocr },
        { key: "Nombres_ocr", value: Nombres_ocr },
        { key: "NoCertificado_ocr", value: NoCertificado_ocr },
        { key: "No_Poliza_ocr", value: No_Poliza_ocr },
        { key: "No_Cuotas_ocr", value: No_Cuotas_ocr },
        { key: "Linea_ocr", value: Linea_ocr },
        {
          key: "Ingresos_Titular_Del_Credito_ocr",
          value: Ingresos_Titular_Del_Credito_ocr,
        },
        { key: "Ing_Intermediario_ocr", value: Ing_Intermediario_ocr },
        { key: "Idsucursal_ocr", value: Idsucursal_ocr },
        { key: "IdSolicitante_ocr", value: IdSolicitante_ocr },
        { key: "IdIntermediario_ocr", value: IdIntermediario_ocr },
        { key: "Id_ocr", value: Id_ocr },
        { key: "FechaNacimiento_ocr", value: FechaNacimiento_ocr },
        { key: "FechaExpedicion_ocr", value: FechaExpedicion_ocr },
        { key: "EstadoCivil_ocr", value: EstadoCivil_ocr },
        { key: "Estado_ocr", value: Estado_ocr },
        { key: "Es_Renovacion_ocr", value: Es_Renovacion_ocr },
        {
          key: "Documento_Poliza_ocr",
          value: Documento_Poliza_ocr,
        },
        { key: "Doc_Tomador_ocr", value: Doc_Tomador_ocr },
        { key: "Doc_Asegurado_ocr", value: Doc_Asegurado_ocr },
        {
          key: "DireccionDeResidencia_ocr",
          value: DireccionDeResidencia_ocr,
        },
        {
          key: "DepartamentoDeNacimiento_ocr",
          value: DepartamentoDeNacimiento_ocr,
        },
        {
          key: "DepartamentoDeExpedicion_ocr",
          value: DepartamentoDeExpedicion_ocr,
        },
        {
          key: "Correo_Electronico_ocr",
          value: Correo_Electronico_ocr,
        },
        {
          key: "CiudadDeResidencia_ocr",
          value: CiudadDeResidencia_ocr,
        },
        {
          key: "CiudadDeNacimiento_ocr",
          value: CiudadDeNacimiento_ocr,
        },
        {
          key: "CiudadDeExpedicion_ocr",
          value: CiudadDeExpedicion_ocr,
        },
        {
          key: "Cel_Titular_Credito_ocr",
          value: Cel_Titular_Credito_ocr,
        },
        {
          key: "Asesor_Intermediario_ocr",
          value: Asesor_Intermediario_ocr,
        },
        { key: "Aseguradora_ocr", value: Aseguradora_ocr },
        { key: "Apellidos_ocr", value: Apellidos_ocr },
        { key: "Anexo_ocr", value: '"' + Anexo_ocr + '"' },
        { key: "Abono_Inicial_ocr", value: Abono_Inicial_ocr },
      ],
    });

    return "procesando";
  };

  getCertificate = async (data) => {
    let en_proceso = false;
    let vigente = false;
    let paz_y_salvo = false;

    const session_id = data.session_id;
    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );

    const estado_certificado = data.user_session_keys.find(
      (item) => item.key === "estado_certificado"
    );

    const placa_certificado = data.user_session_keys.find(
      (item) => item.key === "placa_certificado"
    );

    if (estado_certificado.value == "En Proceso") {
      en_proceso = true;
    }
    if (estado_certificado.value == "Vigente") {
      vigente = true;
    }
    if (estado_certificado.value == "Paz y Salvo") {
      paz_y_salvo = true;
    }

    axios
      .post(
        "https://dev.back-crediseguro.com/api/credits",
        {
          Filtro: placa_certificado.value,
          EstadoConsulta: "",
          IdAseguradora: "",
          Estado: "",
          AllData: false,
          Vigente: vigente,
          Renovacion: false,
          Mora: false,
          EnProceso: en_proceso,
          PazySalvo: paz_y_salvo,
          NumeroRegistros: 10,
          Cancelados: false,
          EnProcesoCancelacion: false,
          Inicial: 0,
          Anio: "0",
          Mes: "0",
        },
        {
          headers: {
            authorization: "Bearer " + token_crediseguro.value,
            "content-type": "application/json",
          },
        }
      )
      .then((response) => {
        if (response.data.data.Creditos) {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "credito_certificado",
                value: "1",
              },
              {
                key: "id_credito_certificado",
                value: response.data.data.Creditos[0].IdCredit,
              },
              {
                key: "id_cliente_certificado",
                value: response.data.data.Creditos[0].IdClient,
              },
              {
                key: "nombre_credito_certificado",
                value: response.data.data.Creditos[0].credito,
              },
            ],
          });
        } else {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "credito_certificado",
                value: "0",
              },
              {
                key: "id_credito_certificado",
                value: "",
              },
              {
                key: "nombre_credito_certificado",
                value: "",
              },
            ],
          });
        }
      })
      .catch((error) => {
        this.notificationChat(data.cellphone, error);
        this.update(session_id, {
          user_session_keys: [
            {
              key: "credito_certificado",
              value: "0",
            },
          ],
        });
        console.error(error);
      });
  };

  downloadCertificate = async (data) => {

    const session_id = data.session_id;
    let url = "";
    let payload = "";
    let name = "";

    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );

    const id_credito_certificado = data.user_session_keys.find(
      (item) => item.key === "id_credito_certificado"
    );

    const id_cliente_certificado = data.user_session_keys.find(
      (item) => item.key === "id_cliente_certificado"
    );

    const nombre_credito_certificado = data.user_session_keys.find(
      (item) => item.key === "nombre_credito_certificado"
    );

    const tipo_certificado = data.user_session_keys.find(
      (item) => item.key === "tipo_certificado"
    );

    const metodo_certificado = data.user_session_keys.find(
      (item) => item.key === "metodo_certificado"
    );

    if (tipo_certificado.value == "Recibo de Pago"){
      name = "Recibo_de_pago";
    }else if (tipo_certificado.value == "Estado Credito"){
      name = "Estado_del_credito";
    }else if (tipo_certificado.value == "Paz y Salvo"){
      name = "paz_y_salvo";
    }

    if (metodo_certificado.value == "Mensaje") {
      url = "https://dev.back-crediseguro.com/api/export-certificate";
      payload = {
        idCredito: id_credito_certificado,
        tipoDoc: name,
      };
    } else if (metodo_certificado.value == "Correo") {
      url = "https://dev.back-crediseguro.com/api/certificate";
      payload = {
        data: [
          {
            creditId: nombre_credito_certificado.value,
            clientId: id_cliente_certificado.value,
            nameCertificate: name,
          },
        ],
      };
    }

    axios
      .post(url, payload, {
        headers: {
          authorization: "Bearer " + token_crediseguro.value,
          "content-type": "application/json",
        },
      })
      .then((response) => {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "certificado",
                value: "1",
              },
            ],
          });
      })
      .catch((error) => {
        this.notificationChat(data.cellphone, error);
        this.update(session_id, {
          user_session_keys: [
            {
              key: "certificado",
              value: "0",
            },
          ],
        });
        console.error(error);
      });
  };

  urlPortal = async (data) => {
    const session_id = data.session_id;

    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );
    const id_peticion_crediseguro = data.user_session_keys.find(
      (item) => item.key === "id_peticion_crediseguro"
    );

    const tipo_credito = data.user_session_keys.find(
      (item) => item.key === "tipo_credito_1"
    );

    const id_aseguradora = data.user_session_keys.find(
      (item) => item.key === "id_aseguradora"
    );


    const texto =
      "whastapp/" +
      token_crediseguro.value +
      "/" +
      id_peticion_crediseguro.value +
      "/" +
      session_id
      +"/"+tipo_credito.value
      +"/"+id_aseguradora.value;
    
    const base64 = Buffer.from(texto).toString("base64");

    const route = tipo_credito.value == "new_credit"?"formulario":"formulario-renovacion";

    const url =
      "https://prototipoportal.crediseguro.co/admin/crear-credito/" +
      route +
      "?data=" +
      base64;  

    const shortUrl = await this.shortenUrl(url);

    this.update(session_id, {
      user_session_keys: [
        {
          key: "url_portal",
          value: shortUrl,
        },
      ],
    });
  }
}

module.exports = new Treble();
