const fs     = require('fs')
const {exit} = require('process')
const xml    = require('xml2js')

// Process arguments
if (process.argv.length !== 4) {
  console.error('Usage: [biosamples directory path] [TSV reference file path]')
  exit(1)
}
const biosamples_dir = process.argv[2]
const tsv_path       = process.argv[3]


// Create the app
class app {
  constructor() {
    this.tsv        = null
    this.biosamples = null
    this.xmlOptions = {
      attrkey: 'attributes',
      charkey: 'text',
    }

    this.readTSV()
  }

  /**
   * Read the giant tsv reference.
   */
  readTSV() {
    fs.readFile(tsv_path, {}, (err, content) => {
      if (err) {
        console.error('Unable to open tsv file', tsv_path, err)
        exit(1)
      }

      this.tsv = []
      content
        .toString()
        .split('\n')
        .forEach((line) => {
          this.tsv.push(line.split('\t'))
        })

      // Ok we parsed the CSV, we can more to reading the XMLs
      this.readBiosamples()
    })
  }


  /**
   * Read and parse all the XML files.
   */
  readBiosamples() {
    this.biosamples = []
    fs.readdir(biosamples_dir, {}, (err, files) => {
      if (err) {
        console.error(err)
        exit(1)
      }

      // these calls are asynchronous so we need a way to figure out when
      // we are ready to move to the next step. Once i == 0, we know we processed
      // all the XML files in the biosamples directory and we can move to the next step
      let i = files.length
      files.forEach((file) => {
        // Allow only XML files. Ignore anything else.
        if (file.indexOf('.xml') === -1) {
          i--
          if (i === 0) {
            this.generateXML()
          }
          return
        }


        // Construct the path to the file
        const path = biosamples_dir + '/' + file
        fs.readFile(path, {}, (err, content) => {
          if (err) {
            console.error(err)
            exit(1)
          }

          // Parse the XML
          xml.parseString(content.toString(), this.xmlOptions, (err, data) => {
            if (err) {
              console.error(err)
              exit(1)
            }

            this.biosamples.push(data)

            i--
            if (i === 0) {
              this.generateXML()
            }
          })
        })
      })
    })
  }

  /**
   * Generate the final XML.
   */
  generateXML() {
    const results = []

    for (let i = 0; i < this.biosamples.length; i++) {
      const biosample_set = this.biosamples[i].BioSampleSet.BioSample
      for (let j = 0; j < biosample_set.length; j++) {
        const biosample = biosample_set[j]

        results.push(this.processSample(biosample))
      }
    }

    const builder = new xml.Builder(this.xmlOptions)
    const built = builder.buildObject({
      BioSampleSet: {
        BioSample: results
      }
    })

    console.log(built)
  }

  /**
   * Correct the biosample XML structure and return it.
   *
   * @param biosample
   * @returns {Object} The sample with the right attributes in the right place.
   */
  processSample(biosample) {
    // Check if the Id with db_label is in 2nd position (i = 1)
    // Sometimes the name is in the attributes section
    console.log(biosample.Ids[0].Id)
    return biosample
  }
}

// Run the app
new app()
