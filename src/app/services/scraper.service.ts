import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from 'angularfire2/firestore';
import * as helper from '../scraper/scraper';
import { Shoe } from '../interfaces/shoe';
import { reject } from 'q';
const stringSimilarity = require('string-similarity');

@Injectable()
export class ScraperService {
  shoesCollection: AngularFirestoreCollection<Shoe>;

  batch;
  shoes: Shoe[];

  constructor(private afStore: AngularFirestore) {
    this.batch = this.afStore.firestore.batch();
    this.shoesCollection = this.afStore.collection('shoesCollection');
  }

  scrape() {
    Promise.all([
      helper.fetchShoesFromYalispor(),
      helper.fetchShoesFromAyakkabiDunyasi(),
      helper.fetchShoesFromTrendyol(),
      helper.fetchShoesFromSportive()
    ])
      .then(results => {
        const [yalispor, ayakkabiDunyasi, trendyol, sportive] = results;
        const products = [].concat(yalispor, ayakkabiDunyasi, trendyol, sportive);
        console.log(products);
        this.writeBatch(products);
      })
      .catch(err => {
        console.log(err);
      });
  }


  async writeBatch(results) {
    results = await this.similarify(results);
    console.log(results);
    for (let i = 0; i < results.length; i++) {
      const docRef = this.shoesCollection.doc(this.afStore.createId()).ref;
      results[i].ID = docRef.id;
      this.batch.set(docRef, results[i]);
    }

    this.batch.commit().then(function () {
      console.log('Database operation finish');
      console.log(results.length);
    });
  }

  similarify(shoes) {
    return new Promise((resolve) => {
      shoes.forEach(shoe => {
        shoe.SimilarWith = [];
      });
      let similarity;
      for (let i = 0; i < shoes.length; i++) {
        for (let k = i + 1; k < shoes.length; k++) {
          similarity = stringSimilarity.compareTwoStrings(shoes[i].BrandName, shoes[k].BrandName);

          if (similarity >= 0.8) {
            shoes[i].SimilarWith.push(shoes[k]);
            shoes.splice(k, 1);
            k--;
          }
        }
      }
      resolve(shoes);
    });
  }

}
