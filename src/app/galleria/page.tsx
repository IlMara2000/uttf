import TeamEditor from '@/components/TeamEditor';
import GalleryProposal from '@/components/GalleryProposal';
import { loadGallery } from '@/lib/gallery-server';
import '../team/team.css';
import './gallery.css';
export default async function GalleryPage() {
 const {members, intro, ready} = await loadGallery();
 return <main className="public-page"><TeamEditor kind="gallery" initialMembers={members} initialIntro={intro} ready={ready} /><GalleryProposal /></main>;
}
