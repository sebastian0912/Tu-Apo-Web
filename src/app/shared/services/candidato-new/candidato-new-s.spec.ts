import { TestBed } from '@angular/core/testing';

import { CandidatoNewS } from './candidato-new-s';

describe('CandidatoNewS', () => {
  let service: CandidatoNewS;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandidatoNewS);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
