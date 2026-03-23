import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      medical: {
        title: 'Medical Information',
        blood_type: 'Blood Type',
        allergies: 'Allergies',
        medications: 'Medications',
        emergency_contact: 'Emergency Contact',
        conditions: 'Medical Conditions',
      },
      pet: {
        title: 'Pet Information',
        name: 'Name',
        species: 'Species',
        breed: 'Breed',
        owner: 'Owner',
        phone: 'Phone',
        address: 'Address',
        reward: 'Reward if found',
      },
      vehicle: {
        title: 'Vehicle Information',
        brand: 'Brand',
        model: 'Model',
        year: 'Year',
        plate: 'License Plate',
        owner: 'Owner',
        phone: 'Phone',
        insurance: 'Insurance',
      },
      elderly: {
        title: 'Person Information',
        name: 'Name',
        age: 'Age',
        condition: 'Condition',
        emergency_contact: 'Emergency Contact',
        address: 'Home Address',
        medications: 'Medications',
      },
      restaurant: {
        title: 'Restaurant Menu',
        welcome: 'Welcome',
        menu: 'Menu',
        contact: 'Contact',
      },
      common: {
        contact: 'Contact',
        location: 'My Location',
        send_location: 'Send My Location',
        location_sent: 'Location sent successfully',
      },
    },
  },
  es: {
    translation: {
      medical: {
        title: 'Información Médica',
        blood_type: 'Tipo de Sangre',
        allergies: 'Alergias',
        medications: 'Medicamentos',
        emergency_contact: 'Contacto de Emergencia',
        conditions: 'Condiciones Médicas',
      },
      pet: {
        title: 'Información de Mascota',
        name: 'Nombre',
        species: 'Especie',
        breed: 'Raza',
        owner: 'Dueño',
        phone: 'Teléfono',
        address: 'Dirección',
        reward: 'Recompensa si se encuentra',
      },
      vehicle: {
        title: 'Información del Vehículo',
        brand: 'Marca',
        model: 'Modelo',
        year: 'Año',
        plate: 'Patente',
        owner: 'Propietario',
        phone: 'Teléfono',
        insurance: 'Seguro',
      },
      elderly: {
        title: 'Información de Persona',
        name: 'Nombre',
        age: 'Edad',
        condition: 'Condición',
        emergency_contact: 'Contacto de Emergencia',
        address: 'Dirección',
        medications: 'Medicamentos',
      },
      restaurant: {
        title: 'Menú del Restaurante',
        welcome: 'Bienvenido',
        menu: 'Menú',
        contact: 'Contacto',
      },
      common: {
        contact: 'Contacto',
        location: 'Mi Ubicación',
        send_location: 'Enviar Mi Ubicación',
        location_sent: 'Ubicación enviada con éxito',
      },
    },
  },
  pt: {
    translation: {
      medical: {
        title: 'Informação Médica',
        blood_type: 'Tipo Sanguíneo',
        allergies: 'Alergias',
        medications: 'Medicamentos',
        emergency_contact: 'Contato de Emergência',
        conditions: 'Condições Médicas',
      },
      pet: {
        title: 'Informação do Animal',
        name: 'Nome',
        species: 'Espécie',
        breed: 'Raça',
        owner: 'Dono',
        phone: 'Telefone',
        address: 'Endereço',
        reward: 'Recompensa se encontrado',
      },
      vehicle: {
        title: 'Informação do Veículo',
        brand: 'Marca',
        model: 'Modelo',
        year: 'Ano',
        plate: 'Placa',
        owner: 'Proprietário',
        phone: 'Telefone',
        insurance: 'Seguro',
      },
      elderly: {
        title: 'Informação da Pessoa',
        name: 'Nome',
        age: 'Idade',
        condition: 'Condição',
        emergency_contact: 'Contato de Emergência',
        address: 'Endereço',
        medications: 'Medicamentos',
      },
      restaurant: {
        title: 'Cardápio do Restaurante',
        welcome: 'Bem-vindo',
        menu: 'Cardápio',
        contact: 'Contato',
      },
      common: {
        contact: 'Contato',
        location: 'Minha Localização',
        send_location: 'Enviar Minha Localização',
        location_sent: 'Localização enviada com sucesso',
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: [],
    },
  });

export default i18n;
