import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ResumeImport from '../components/resume/ResumeImport';
import { createEmptyCareerProfile } from '../utils/careerProfile';
import { parseResumeText, readResumeFile } from '../utils/resumeImport';

jest.mock('../utils/resumeImport', () => ({
  ...jest.requireActual('../utils/resumeImport'),
  readResumeFile: jest.fn(),
}));
const choose = () => fireEvent.change(screen.getByLabelText('Choose TXT resume'), { target: { files: [new File(['Name: Alex'], 'resume.txt')] } });
afterEach(() => jest.restoreAllMocks());

test('cancelled async reads cannot reopen the review', async () => {
  let finish;
  readResumeFile.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const save = jest.fn();
  render(<ResumeImport current={createEmptyCareerProfile()} onSave={save} onBackup={jest.fn()} />);
  choose();
  fireEvent.click(screen.getByText('Cancel Import'));
  await act(async () => finish(parseResumeText('Name: Alex')));
  expect(screen.queryByLabelText('Import name')).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

test('only the latest selected file may populate review', async () => {
  let finish;
  readResumeFile.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  readResumeFile.mockResolvedValueOnce(parseResumeText('Name: Latest'));
  render(<ResumeImport current={createEmptyCareerProfile()} onSave={jest.fn()} onBackup={jest.fn()} />);
  choose();
  choose();
  expect(await screen.findByLabelText('Import name')).toHaveValue('Latest');
  await act(async () => finish(parseResumeText('Name: Stale')));
  expect(screen.getByLabelText('Import name')).toHaveValue('Latest');
});

test('manual entries, backup and save failure leave an editable draft', async () => {
  readResumeFile.mockResolvedValueOnce(parseResumeText('Name: Alex'));
  const backup = jest.fn();
  const save = jest.fn(() => false);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<ResumeImport current={createEmptyCareerProfile()} onSave={save} onBackup={backup} />);
  choose();
  await screen.findByLabelText('Import name');
  fireEvent.click(screen.getByText('Add import experience'));
  fireEvent.change(screen.getByLabelText('Experience 1: Role'), { target: { value: 'Engineer' } });
  fireEvent.click(screen.getByText('Back Up Before Import'));
  expect(backup).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Confirm Resume Import'));
  expect(save.mock.calls[0][0].experiences[0].position).toBe('Engineer');
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  expect(screen.getByLabelText('Experience 1: Role')).toHaveValue('Engineer');
});
