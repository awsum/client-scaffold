import config from '../../config'
import { fileService } from '../services/file.service'
import { FileHelper } from './file.helper'
import { DOCUMENT_POLICIES } from '../const/const'

/**
 * Wrapper to simplify work with documents
 */
export class DocumentContainer {
  /**
   * @param {object} [opts]
   * @param {File} [opts.file] - file representing a document
   * @param {string} [opts.key] - key to access file in storage
   * @param {string} opts.name - file name
   * @param {string} opts.mimeType - file MIME type
   * @param {string} opts.type - document type {@link documentTypes} of the
   *        document (!! nothing common with MIME-type)
   */
  constructor (opts) {
    if (!opts.file && !opts.key) {
      throw new Error('Document initialized without raw file or file key')
    }
    this.mimeType = opts.mimeType
    this.file = opts.file
    this.name = opts.name
    this.type = opts.type
    this.key = opts.key

    this._arrayBuffer = []
    this._privateUrl = ''
    this._dataUrl = ''
  }

  getDetailsForSave () {
    return {
      mime_type: this.mimeType,
      name: this.name,
      key: this.key
    }
  }

  getDetailsForUpload () {
    if (!DOCUMENT_POLICIES[this.type]) {
      throw new Error('Unknown document type: ' + this.type)
    }
    return {
      type: DOCUMENT_POLICIES[this.type],
      mimeType: this.mimeType,
      file: this.file
    }
  }

  setKey (key) {
    this.key = key
  }

  get isUploaded () {
    return !!(this.key && !this.file)
  }

  /**
   * URL from where the public file can be downloaded.
   * (!! works only with public files, private urls should be derived
   * by {@link derivePrivateUrl}
   *
   * @returns {string} publicUrl
   */
  get publicUrl () {
    if (!this.key) return ''
    return `${config.FILE_STORAGE}/${this.key}`
  }

  /**
   * URL from where the private file can be downloaded.
   * Call {@link derivePrivateUrl} before using this getter
   *
   * @returns {string} privateURL
   */
  get privateUrl () {
    return this._privateUrl
  }

  /**
   * Data URL of the new file to allow browser open it before uploaded.
   * Call {@link deriveDataUrl} before using this getter
   *
   * @returns {string} dataUrl
   */
  get dataUrl () {
    return this._dataUrl
  }

  /**
   * File converted to AB format. You should upload files in this format.
   * Call {@link deriveArrayBuffer} before using this getter
   *
   * @returns {ArrayBuffer} arrayBuffer
   */
  get arrayBuffer () {
    return this._arrayBuffer
  }

  async derivePrivateUrl () {
    if (!this.key) {
      throw new Error(`
        To derive private url file must be already uploaded and contain
        the key
      `)
    }
    const details = await fileService.loadDocumentDetailsById(this.key)
    this._privateUrl = details.data('url')
  }

  async deriveDataUrl () {
    if (!this.file) {
      throw new Error('Data url can be derived only if raw file is present')
    }
    this._dataUrl = await FileHelper.readFileAsDataURL(this.file)
  }

  async deriveArrayBuffer () {
    if (!this.file) {
      throw new Error('Array buffer can be derived only if file is present')
    }
    this._arrayBuffer = await FileHelper.readFileAsArrayBuffer(this.file)
  }
}

/**
 * Wraps object with doc details
 * view {@link DocumentContainer.getDetailsForSave}
 * to {@link DocumentContainer} instance
 *
 * @param {object} documents - list of documents where key is document type
 *        {@link documentTypes}, value - details generated by
 *        {@link DocumentContainer.getDetailsForSave}
 * @returns {object} wrappedDocuments
 */
export function wrapDocuments (documents) {
  if (!documents) return {}
  return Object.entries(documents)
    .reduce((documents, [type, doc]) => {
      // .front is here only for backwards compatibility:
      documents[type] = doc && (doc.key || doc.file || doc.front)
        ? new DocumentContainer(doc.front || doc)
        : null
      return documents
    }, {})
}

export function unwrapDocuments (documents) {
  if (!documents) return {}
  return Object.entries(documents)
    .reduce((documents, [type, doc]) => {
      documents[type] = doc ? doc.getDetailsForSave() : null
      return documents
    }, {})
}
